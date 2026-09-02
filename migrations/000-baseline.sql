-- =====================================================================================
-- 000-baseline.sql — reconstructable base schema (audit 2026-08-12, P1 D-01)
--
-- WHY THIS EXISTS
-- The repo shipped migrations 020 and 037-055 only. The 34 files that built everything before
-- that — including 000-database-setup.sql, which creates the core tables — were not in version
-- control. The production database could not be reconstructed from source, no reviewer could
-- verify a column type or constraint, and no fresh environment could be stood up.
--
-- CORRECTION TO THE ORIGINAL AUDIT FINDING
-- The finding also claimed there was no applied-migrations table and no runner. The table DOES
-- exist (`schema_migrations`, columns: name, applied_at, checksum) and records 38 applied
-- migrations from 2026-04-24, starting at 000-database-setup.sql. What is missing is the runner
-- (nothing in src/ or scripts/ references the table any more) and the migration FILES themselves.
-- So the history was tracked; the artefacts were lost.
--
-- HOW THIS FILE WAS PRODUCED
-- `pg_dump --schema-only --no-owner --no-privileges` against the live development database, which
-- shares its lineage with production. It is a faithful dump, NOT hand-written or inferred — no
-- schema here was guessed.
--
-- PRODUCTION-ONLY STATE THAT CANNOT BE RECONSTRUCTED FROM THIS FILE
--   * Row data of every kind (clients, projects, payments, outreach history).
--   * Neon-specific settings: autoscale limits, history retention, branch topology, connection
--     pooling mode. These live in the Neon console, not in SQL.
--   * Any object created by hand directly against production and never mirrored to development.
--     Verify with: npm run verify:payments (checks the money-path constraints specifically),
--     and diff `\dt` between environments before trusting this file for a production rebuild.
--
-- USAGE
--   psql "$DATABASE_URL" -f migrations/000-baseline.sql   # fresh database only
-- Then apply 056+ in order. Do NOT run this against a database that already has tables.
-- =====================================================================================

--
-- PostgreSQL database dump
--


--
-- PostgreSQL database dump
--

\restrict CuqiVXMDXGw4ZxlwvpJGOm9k3BbsrkxBiiM4lb2giOR3HTAkZl201w3YLjXzScW

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: package_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.package_type AS ENUM (
    'starter',
    'growth',
    'scale'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'new',
    'proposal_sent',
    'deposit_paid',
    'in_production',
    'ready_for_final_payment',
    'paid_in_full',
    'launched',
    'not_interested'
);


--
-- Name: timeline_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.timeline_type AS ENUM (
    'asap',
    'this_month',
    'next_month',
    'no_rush'
);


--
-- Name: cleanup_expired_auth_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_auth_tokens() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
  DELETE FROM auth_magic_links WHERE expires_at < NOW();
  DELETE FROM auth_password_resets WHERE expires_at < NOW();
  DELETE FROM auth_email_verifications WHERE expires_at < NOW();
END;
$$;


--
-- Name: update_milestone_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_milestone_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone
);


--
-- Name: affiliates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text,
    website text,
    referral_code text NOT NULL,
    commission_rate integer DEFAULT 20,
    status text DEFAULT 'pending'::text,
    paypal_email text,
    total_clicks integer DEFAULT 0,
    total_conversions integer DEFAULT 0,
    total_earned_cents integer DEFAULT 0,
    total_paid_cents integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    auth_user_id uuid,
    CONSTRAINT affiliates_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'paused'::text, 'rejected'::text])))
);


--
-- Name: ai_chat_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    token_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor text DEFAULT 'admin'::text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_email_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_magic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_magic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    token_hash text NOT NULL,
    redirect_to text DEFAULT '/portal'::text,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_mfa_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_mfa_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    secret_encrypted text NOT NULL,
    verified boolean DEFAULT false,
    friendly_name text DEFAULT 'Authenticator App'::text,
    created_at timestamp with time zone DEFAULT now(),
    last_used_step bigint
);


--
-- Name: auth_password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    aal text DEFAULT 'aal1'::text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    failed_login_count integer DEFAULT 0,
    locked_until timestamp with time zone,
    account_type text,
    credentials_shown_at timestamp with time zone
);


--
-- Name: banned_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banned_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: brief_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brief_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    company_name text NOT NULL,
    website text,
    industry text NOT NULL,
    primary_goal text NOT NULL,
    audience text NOT NULL,
    pain_points text,
    challenge text,
    notes text,
    demo_reference text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: checklist_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: demo_license_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demo_license_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    license_id uuid NOT NULL,
    fingerprint_hash text NOT NULL,
    device_label text,
    first_ip inet,
    last_ip inet,
    user_agent text,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    revoke_cooldown_until timestamp with time zone
);


--
-- Name: demo_license_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demo_license_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    license_id uuid NOT NULL,
    domain text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    verification_token text,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone
);


--
-- Name: demo_license_downloads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demo_license_downloads (
    id bigint NOT NULL,
    license_id uuid NOT NULL,
    watermark_id text NOT NULL,
    ip inet,
    user_agent text,
    downloaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: demo_license_downloads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.demo_license_downloads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: demo_license_downloads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.demo_license_downloads_id_seq OWNED BY public.demo_license_downloads.id;


--
-- Name: demo_license_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demo_license_validations (
    id bigint NOT NULL,
    license_id uuid,
    device_id uuid,
    origin text,
    ip inet,
    user_agent text,
    result text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT demo_license_validations_result_check CHECK ((result = ANY (ARRAY['ok'::text, 'device_limit'::text, 'domain_blocked'::text, 'license_revoked'::text, 'license_expired'::text, 'license_not_found'::text, 'invalid_signature'::text, 'rate_limited'::text, 'cooldown_active'::text])))
);


--
-- Name: demo_license_validations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.demo_license_validations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: demo_license_validations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.demo_license_validations_id_seq OWNED BY public.demo_license_validations.id;


--
-- Name: demo_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demo_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    license_key_hash text NOT NULL,
    license_key_prefix text NOT NULL,
    user_id uuid,
    buyer_email text NOT NULL,
    purchase_id uuid,
    demo_slug text NOT NULL,
    plan text DEFAULT 'personal'::text NOT NULL,
    max_devices integer DEFAULT 3 NOT NULL,
    max_domains integer DEFAULT 3 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    last_validated_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_reason text,
    CONSTRAINT demo_licenses_max_devices_check CHECK ((max_devices > 0)),
    CONSTRAINT demo_licenses_max_domains_check CHECK ((max_domains >= 0)),
    CONSTRAINT demo_licenses_plan_check CHECK ((plan = ANY (ARRAY['personal'::text, 'team'::text, 'studio'::text]))),
    CONSTRAINT demo_licenses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'revoked'::text, 'expired'::text])))
);


--
-- Name: email_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    error text NOT NULL,
    context text,
    critical boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_suppressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_suppressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text DEFAULT 'one_click_unsubscribe'::text NOT NULL,
    source text,
    notes text,
    unsubscribed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_suppressions_reason_check CHECK ((reason = ANY (ARRAY['one_click_unsubscribe'::text, 'manual_unsubscribe'::text, 'hard_bounce'::text, 'spam_complaint'::text, 'reply_remove_request'::text, 'admin_suppressed'::text])))
);


--
-- Name: file_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_store (
    storage_key text NOT NULL,
    file_data bytea NOT NULL,
    content_type text DEFAULT 'application/octet-stream'::text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid,
    uploaded_by text
);


--
-- Name: ip_reputation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_reputation (
    ip text NOT NULL,
    offense_count integer DEFAULT 0 NOT NULL,
    last_rule text,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone
);


--
-- Name: mistakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mistakes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    source text DEFAULT 'ai'::text NOT NULL,
    message_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mistakes_source_check CHECK ((source = ANY (ARRAY['ai'::text, 'client'::text, 'admin'::text]))),
    CONSTRAINT mistakes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'fixed'::text, 'dismissed'::text])))
);


--
-- Name: onboarding_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    message text NOT NULL,
    question_number integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT onboarding_messages_role_check CHECK ((role = ANY (ARRAY['ai'::text, 'client'::text])))
);


--
-- Name: onboarding_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    current_question integer DEFAULT 1 NOT NULL,
    summary text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT onboarding_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text])))
);


--
-- Name: outreach_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location text NOT NULL,
    niche text NOT NULL,
    platform text DEFAULT 'email'::text,
    leads_extracted integer DEFAULT 0,
    emails_sent integer DEFAULT 0,
    replies integer DEFAULT 0,
    booked_calls integer DEFAULT 0,
    closed_deals integer DEFAULT 0,
    status text DEFAULT 'extracted'::text,
    notes text,
    extracted_at timestamp with time zone DEFAULT now(),
    first_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT outreach_campaigns_status_check CHECK ((status = ANY (ARRAY['extracted'::text, 'sending'::text, 'sent'::text, 'follow_up'::text, 'completed'::text])))
);


--
-- Name: outreach_domain_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_domain_limits (
    domain text NOT NULL,
    daily_cap integer DEFAULT 25 NOT NULL,
    hard_ceiling integer DEFAULT 40 NOT NULL,
    sent_today integer DEFAULT 0 NOT NULL,
    sent_today_date date,
    is_transactional boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outreach_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    send_id uuid NOT NULL,
    event_type text NOT NULL,
    open_type text,
    url text,
    user_agent text,
    ip_address text,
    ip_hash text,
    country text,
    city text,
    reply_body text,
    reply_classification text,
    reply_match_confidence text,
    raw_headers jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    handled_at timestamp with time zone,
    handled_by text,
    CONSTRAINT outreach_events_event_type_check CHECK ((event_type = ANY (ARRAY['delivered'::text, 'open'::text, 'click'::text, 'reply'::text, 'bounce'::text, 'unsubscribe'::text, 'complaint'::text]))),
    CONSTRAINT outreach_events_open_type_check CHECK ((open_type = ANY (ARRAY['real'::text, 'mpp_prefetch'::text, 'gmail_proxy'::text, 'unknown'::text]))),
    CONSTRAINT outreach_events_reply_classification_check CHECK ((reply_classification = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text, 'remove'::text, 'ooo'::text, 'bounce'::text, 'uncertain'::text]))),
    CONSTRAINT outreach_events_reply_match_confidence_check CHECK ((reply_match_confidence = ANY (ARRAY['exact'::text, 'header_chain'::text, 'reply_to_token'::text, 'fuzzy'::text, 'manual'::text])))
);


--
-- Name: outreach_inboxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_inboxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    email text NOT NULL,
    display_name text NOT NULL,
    type text NOT NULL,
    daily_cap integer DEFAULT 25 NOT NULL,
    min_spacing_seconds integer DEFAULT 280 NOT NULL,
    max_spacing_seconds integer DEFAULT 360 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    paused boolean DEFAULT false NOT NULL,
    sent_today integer DEFAULT 0 NOT NULL,
    sent_today_date date,
    last_sent_at timestamp with time zone,
    warmup_start_date date,
    warmup_daily_cap integer,
    bounce_rate_7d numeric(5,4) DEFAULT 0 NOT NULL,
    complaint_rate_7d numeric(5,4) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT outreach_inboxes_type_check CHECK ((type = ANY (ARRAY['oauth2'::text, 'app_password'::text])))
);


--
-- Name: outreach_placement_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_placement_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inbox_id uuid,
    campaign_id uuid,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    sends_7d integer DEFAULT 0 NOT NULL,
    open_rate_real_7d numeric(5,4) DEFAULT 0,
    bounce_rate_7d numeric(5,4) DEFAULT 0,
    complaint_rate_7d numeric(5,4) DEFAULT 0,
    unsubscribe_rate_7d numeric(5,4) DEFAULT 0,
    sends_today integer DEFAULT 0,
    open_rate_real_today numeric(5,4) DEFAULT 0,
    open_rate_alert boolean DEFAULT false,
    bounce_alert boolean DEFAULT false,
    complaint_alert boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outreach_prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_prospects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    email text,
    name text NOT NULL,
    website text,
    phone text,
    city text,
    lat numeric(10,6),
    lng numeric(10,6),
    place_id text,
    analysis jsonb,
    social_links jsonb,
    principal_name text,
    screenshot_path text,
    draft_archetype text,
    draft_subject text,
    draft_body text,
    draft_body_html text,
    email_validated boolean DEFAULT false NOT NULL,
    email_validation_reason text,
    status text DEFAULT 'new'::text NOT NULL,
    last_contact_at timestamp with time zone,
    replied_at timestamp with time zone,
    unsubscribed_at timestamp with time zone,
    bounced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT outreach_prospects_status_check CHECK ((status = ANY (ARRAY['new'::text, 'queued'::text, 'sent'::text, 'opened'::text, 'clicked'::text, 'replied'::text, 'unsubscribed'::text, 'bounced'::text, 'suppressed'::text, 'follow_up_due'::text])))
);


--
-- Name: outreach_seed_inboxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_seed_inboxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    provider text NOT NULL,
    label text,
    active boolean DEFAULT true NOT NULL,
    last_test_at timestamp with time zone,
    last_placement text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT outreach_seed_inboxes_last_placement_check CHECK ((last_placement = ANY (ARRAY['inbox'::text, 'spam'::text, 'promotions'::text, 'updates'::text, 'unknown'::text, 'not_received'::text]))),
    CONSTRAINT outreach_seed_inboxes_provider_check CHECK ((provider = ANY (ARRAY['gmail'::text, 'outlook'::text, 'yahoo'::text, 'proton'::text, 'icloud'::text, 'other'::text])))
);


--
-- Name: outreach_send_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_send_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prospect_id uuid NOT NULL,
    inbox_id uuid NOT NULL,
    campaign_id uuid,
    follow_up_number integer DEFAULT 0 NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    claimed_by text,
    claimed_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT outreach_send_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'skipped_suppressed'::text, 'skipped_cap'::text, 'cancelled'::text])))
);


--
-- Name: outreach_sends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outreach_sends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prospect_id uuid NOT NULL,
    campaign_id uuid,
    inbox_id uuid NOT NULL,
    follow_up_number integer DEFAULT 0 NOT NULL,
    subject text NOT NULL,
    body_text text NOT NULL,
    body_html text,
    message_id text NOT NULL,
    tracking_token uuid DEFAULT gen_random_uuid() NOT NULL,
    reply_to_token uuid DEFAULT gen_random_uuid() NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    first_open_at timestamp with time zone,
    first_click_at timestamp with time zone,
    replied_at timestamp with time zone,
    bounced_at timestamp with time zone,
    open_count_real integer DEFAULT 0 NOT NULL,
    open_count_raw integer DEFAULT 0 NOT NULL,
    click_count integer DEFAULT 0 NOT NULL,
    replied boolean DEFAULT false NOT NULL,
    bounced boolean DEFAULT false NOT NULL,
    unsubscribed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    paypal_event_id text,
    raw_capture_id text,
    kind text NOT NULL,
    amount_cents integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    type text NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    paypal_event_id text,
    paypal_payment_status text,
    paypal_capture_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'final'::text])))
);


--
-- Name: preview_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preview_events (
    id bigint NOT NULL,
    link_id uuid NOT NULL,
    kind text NOT NULL,
    surface text DEFAULT 'gate'::text NOT NULL,
    scroll_pct smallint,
    seconds integer,
    stage text,
    ua text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    label text
);


--
-- Name: preview_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.preview_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preview_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.preview_events_id_seq OWNED BY public.preview_events.id;


--
-- Name: preview_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preview_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    practice_name text NOT NULL,
    slug text NOT NULL,
    preview_url text NOT NULL,
    package text DEFAULT 'growth'::text NOT NULL,
    contact_email text,
    status text DEFAULT 'pending'::text NOT NULL,
    project_id uuid,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    current_url text,
    comparison jsonb,
    first_opened_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    open_count integer DEFAULT 0 NOT NULL,
    viewed_site_at timestamp with time zone,
    site_reached_at timestamp with time zone,
    gate_scroll_pct smallint DEFAULT 0 NOT NULL,
    site_scroll_pct smallint DEFAULT 0 NOT NULL,
    gate_seconds integer DEFAULT 0 NOT NULL,
    site_seconds integer DEFAULT 0 NOT NULL,
    last_stage text,
    click_count integer DEFAULT 0 NOT NULL,
    liked_at timestamp with time zone,
    followed_up_at timestamp with time zone,
    followup_count integer DEFAULT 0 NOT NULL,
    decision_email text,
    yes_at timestamp with time zone,
    CONSTRAINT preview_links_package_check CHECK ((package = ANY (ARRAY['starter'::text, 'growth'::text, 'scale'::text]))),
    CONSTRAINT preview_links_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'liked'::text, 'approved'::text, 'declined'::text, 'exploring'::text])))
);


--
-- Name: preview_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preview_measurements (
    slug text NOT NULL,
    current_url text,
    comparison jsonb NOT NULL,
    measured_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: preview_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preview_otps (
    email text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    requested_by text NOT NULL,
    original_cents integer NOT NULL,
    override_cents integer NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text,
    decided_by text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT price_overrides_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    milestone_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    requires_approval boolean DEFAULT false NOT NULL,
    client_approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_milestones_milestone_type_check CHECK ((milestone_type = ANY (ARRAY['brief_received'::text, 'research_complete'::text, 'wireframe_sent'::text, 'wireframe_approved'::text, 'build_complete'::text, 'final_review_sent'::text, 'final_review_approved'::text, 'launched'::text]))),
    CONSTRAINT project_milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    package public.package_type NOT NULL,
    timeline public.timeline_type NOT NULL,
    status public.project_status DEFAULT 'new'::public.project_status,
    deposit_payment_url text,
    final_payment_url text,
    preview_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    launched_at timestamp with time zone,
    site_id text,
    admin_notes text DEFAULT ''::text,
    package_customizations jsonb,
    source text DEFAULT 'brief'::text,
    referral_code text,
    preview_approved_at timestamp with time zone,
    CONSTRAINT projects_source_check CHECK ((source = ANY (ARRAY['brief'::text, 'quote'::text, 'phone'::text])))
);


--
-- Name: project_payment_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_payment_summary AS
 SELECT p.id AS project_id,
    p.package,
    p.status,
    COALESCE(sum(
        CASE
            WHEN (pay.type = 'deposit'::text) THEN pay.amount_cents
            ELSE 0
        END), (0)::bigint) AS deposit_paid_cents,
    COALESCE(sum(
        CASE
            WHEN (pay.type = 'final'::text) THEN pay.amount_cents
            ELSE 0
        END), (0)::bigint) AS final_paid_cents,
    COALESCE(sum(pay.amount_cents), (0)::bigint) AS total_paid_cents,
    max(
        CASE
            WHEN (pay.type = 'deposit'::text) THEN pay.created_at
            ELSE NULL::timestamp with time zone
        END) AS deposit_paid_at,
    max(
        CASE
            WHEN (pay.type = 'final'::text) THEN pay.created_at
            ELSE NULL::timestamp with time zone
        END) AS final_paid_at
   FROM (public.projects p
     LEFT JOIN public.payments pay ON ((p.id = pay.project_id)))
  GROUP BY p.id, p.package, p.status;


--
-- Name: project_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    storage_path text NOT NULL,
    uploaded_by text NOT NULL,
    category text DEFAULT 'other'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    company_name text NOT NULL,
    package text NOT NULL,
    custom_price_cents integer,
    notes text,
    valid_until timestamp with time zone NOT NULL,
    status text DEFAULT 'draft'::text,
    deposit_payment_url text,
    viewed_at timestamp with time zone,
    accepted_at timestamp with time zone,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    proposal_sections jsonb,
    CONSTRAINT proposals_package_check CHECK ((package = ANY (ARRAY['starter'::text, 'growth'::text, 'scale'::text]))),
    CONSTRAINT proposals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'expired'::text])))
);


--
-- Name: rate_limit_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_counters (
    bucket text NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: referral_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    affiliate_id uuid NOT NULL,
    url text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: referral_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    affiliate_id uuid NOT NULL,
    project_id uuid,
    payment_id uuid,
    commission_cents integer NOT NULL,
    status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT referral_conversions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'rejected'::text])))
);


--
-- Name: revision_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revision_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT revision_messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['client'::text, 'admin'::text, 'ai'::text])))
);


--
-- Name: scheduled_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    company_name text NOT NULL,
    package text NOT NULL,
    notes text,
    send_at timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scheduled_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum text
);


--
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    user_id uuid,
    email text,
    ip_address text,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb,
    severity text DEFAULT 'info'::text,
    created_at timestamp with time zone DEFAULT now(),
    prev_hash text,
    entry_hash text
);


--
-- Name: strata_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strata_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id text DEFAULT 'stratalanding'::text NOT NULL,
    session_id text NOT NULL,
    event_type text NOT NULL,
    url text NOT NULL,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    props jsonb DEFAULT '{}'::jsonb,
    device_type text,
    browser text,
    os text,
    screen_width integer,
    screen_height integer,
    country text,
    city text,
    created_at timestamp with time zone DEFAULT now(),
    ip_address text,
    latitude double precision,
    longitude double precision,
    device_model text
);


--
-- Name: strata_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strata_recordings (
    id bigint NOT NULL,
    session_id text NOT NULL,
    site_id text NOT NULL,
    sequence integer NOT NULL,
    events jsonb NOT NULL,
    event_count integer NOT NULL,
    size_bytes integer NOT NULL,
    url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: strata_recordings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.strata_recordings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: strata_recordings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.strata_recordings_id_seq OWNED BY public.strata_recordings.id;


--
-- Name: strata_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strata_sessions (
    id text NOT NULL,
    site_id text DEFAULT 'stratalanding'::text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    entry_page text NOT NULL,
    exit_page text,
    pageview_count integer DEFAULT 1,
    event_count integer DEFAULT 0,
    referrer text,
    utm_source text,
    utm_medium text,
    device_type text,
    browser text,
    os text,
    country text,
    city text,
    is_bounce boolean DEFAULT true,
    duration_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    ip_address text,
    latitude double precision,
    longitude double precision,
    device_model text,
    has_recording boolean DEFAULT false,
    is_finalized boolean DEFAULT false,
    finalized_at timestamp with time zone
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    source text DEFAULT 'ai'::text NOT NULL,
    message_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text]))),
    CONSTRAINT tasks_source_check CHECK ((source = ANY (ARRAY['ai'::text, 'admin'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: template_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id text NOT NULL,
    plan text NOT NULL,
    display_name text NOT NULL,
    storage_key text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT template_files_plan_check CHECK ((plan = ANY (ARRAY['presence-page'::text, 'lead-page'::text, 'purchase-page'::text])))
);


--
-- Name: template_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_email text NOT NULL,
    buyer_name text NOT NULL,
    buyer_phone text,
    buyer_company text,
    template_id text NOT NULL,
    plan text NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    paypal_order_id text,
    paypal_capture_id text,
    paypal_status text,
    download_count integer DEFAULT 0 NOT NULL,
    delivered_via_email boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    download_consumed_at timestamp with time zone
);


--
-- Name: demo_license_downloads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_downloads ALTER COLUMN id SET DEFAULT nextval('public.demo_license_downloads_id_seq'::regclass);


--
-- Name: demo_license_validations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_validations ALTER COLUMN id SET DEFAULT nextval('public.demo_license_validations_id_seq'::regclass);


--
-- Name: preview_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_events ALTER COLUMN id SET DEFAULT nextval('public.preview_events_id_seq'::regclass);


--
-- Name: strata_recordings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strata_recordings ALTER COLUMN id SET DEFAULT nextval('public.strata_recordings_id_seq'::regclass);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: affiliates affiliates_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_email_key UNIQUE (email);


--
-- Name: affiliates affiliates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_pkey PRIMARY KEY (id);


--
-- Name: affiliates affiliates_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_referral_code_key UNIQUE (referral_code);


--
-- Name: ai_chat_usage ai_chat_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_usage
    ADD CONSTRAINT ai_chat_usage_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_usage ai_chat_usage_project_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_usage
    ADD CONSTRAINT ai_chat_usage_project_id_date_key UNIQUE (project_id, date);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: auth_email_verifications auth_email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_email_verifications
    ADD CONSTRAINT auth_email_verifications_pkey PRIMARY KEY (id);


--
-- Name: auth_magic_links auth_magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_magic_links
    ADD CONSTRAINT auth_magic_links_pkey PRIMARY KEY (id);


--
-- Name: auth_mfa_factors auth_mfa_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_mfa_factors
    ADD CONSTRAINT auth_mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: auth_password_resets auth_password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_password_resets
    ADD CONSTRAINT auth_password_resets_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: banned_emails banned_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_emails
    ADD CONSTRAINT banned_emails_email_key UNIQUE (email);


--
-- Name: banned_emails banned_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_emails
    ADD CONSTRAINT banned_emails_pkey PRIMARY KEY (id);


--
-- Name: brief_submissions brief_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_submissions
    ADD CONSTRAINT brief_submissions_pkey PRIMARY KEY (id);


--
-- Name: checklist_subscribers checklist_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_subscribers
    ADD CONSTRAINT checklist_subscribers_email_key UNIQUE (email);


--
-- Name: checklist_subscribers checklist_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_subscribers
    ADD CONSTRAINT checklist_subscribers_pkey PRIMARY KEY (id);


--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: demo_license_devices demo_license_devices_license_id_fingerprint_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_devices
    ADD CONSTRAINT demo_license_devices_license_id_fingerprint_hash_key UNIQUE (license_id, fingerprint_hash);


--
-- Name: demo_license_devices demo_license_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_devices
    ADD CONSTRAINT demo_license_devices_pkey PRIMARY KEY (id);


--
-- Name: demo_license_domains demo_license_domains_license_id_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_domains
    ADD CONSTRAINT demo_license_domains_license_id_domain_key UNIQUE (license_id, domain);


--
-- Name: demo_license_domains demo_license_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_domains
    ADD CONSTRAINT demo_license_domains_pkey PRIMARY KEY (id);


--
-- Name: demo_license_downloads demo_license_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_downloads
    ADD CONSTRAINT demo_license_downloads_pkey PRIMARY KEY (id);


--
-- Name: demo_license_downloads demo_license_downloads_watermark_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_downloads
    ADD CONSTRAINT demo_license_downloads_watermark_id_key UNIQUE (watermark_id);


--
-- Name: demo_license_validations demo_license_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_validations
    ADD CONSTRAINT demo_license_validations_pkey PRIMARY KEY (id);


--
-- Name: demo_licenses demo_licenses_license_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_licenses
    ADD CONSTRAINT demo_licenses_license_key_hash_key UNIQUE (license_key_hash);


--
-- Name: demo_licenses demo_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_licenses
    ADD CONSTRAINT demo_licenses_pkey PRIMARY KEY (id);


--
-- Name: email_failures email_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_failures
    ADD CONSTRAINT email_failures_pkey PRIMARY KEY (id);


--
-- Name: email_suppressions email_suppressions_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_suppressions
    ADD CONSTRAINT email_suppressions_email_key UNIQUE (email);


--
-- Name: email_suppressions email_suppressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_suppressions
    ADD CONSTRAINT email_suppressions_pkey PRIMARY KEY (id);


--
-- Name: file_store file_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_store
    ADD CONSTRAINT file_store_pkey PRIMARY KEY (storage_key);


--
-- Name: ip_reputation ip_reputation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_reputation
    ADD CONSTRAINT ip_reputation_pkey PRIMARY KEY (ip);


--
-- Name: mistakes mistakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mistakes
    ADD CONSTRAINT mistakes_pkey PRIMARY KEY (id);


--
-- Name: onboarding_messages onboarding_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_messages
    ADD CONSTRAINT onboarding_messages_pkey PRIMARY KEY (id);


--
-- Name: onboarding_sessions onboarding_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sessions
    ADD CONSTRAINT onboarding_sessions_pkey PRIMARY KEY (id);


--
-- Name: outreach_campaigns outreach_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_campaigns
    ADD CONSTRAINT outreach_campaigns_pkey PRIMARY KEY (id);


--
-- Name: outreach_domain_limits outreach_domain_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_domain_limits
    ADD CONSTRAINT outreach_domain_limits_pkey PRIMARY KEY (domain);


--
-- Name: outreach_events outreach_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_events
    ADD CONSTRAINT outreach_events_pkey PRIMARY KEY (id);


--
-- Name: outreach_inboxes outreach_inboxes_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_inboxes
    ADD CONSTRAINT outreach_inboxes_label_key UNIQUE (label);


--
-- Name: outreach_inboxes outreach_inboxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_inboxes
    ADD CONSTRAINT outreach_inboxes_pkey PRIMARY KEY (id);


--
-- Name: outreach_placement_snapshots outreach_placement_snapshots_inbox_id_campaign_id_snapshot__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_placement_snapshots
    ADD CONSTRAINT outreach_placement_snapshots_inbox_id_campaign_id_snapshot__key UNIQUE (inbox_id, campaign_id, snapshot_date);


--
-- Name: outreach_placement_snapshots outreach_placement_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_placement_snapshots
    ADD CONSTRAINT outreach_placement_snapshots_pkey PRIMARY KEY (id);


--
-- Name: outreach_prospects outreach_prospects_campaign_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_prospects
    ADD CONSTRAINT outreach_prospects_campaign_id_email_key UNIQUE (campaign_id, email);


--
-- Name: outreach_prospects outreach_prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_prospects
    ADD CONSTRAINT outreach_prospects_pkey PRIMARY KEY (id);


--
-- Name: outreach_seed_inboxes outreach_seed_inboxes_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_seed_inboxes
    ADD CONSTRAINT outreach_seed_inboxes_email_key UNIQUE (email);


--
-- Name: outreach_seed_inboxes outreach_seed_inboxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_seed_inboxes
    ADD CONSTRAINT outreach_seed_inboxes_pkey PRIMARY KEY (id);


--
-- Name: outreach_send_queue outreach_send_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_send_queue
    ADD CONSTRAINT outreach_send_queue_pkey PRIMARY KEY (id);


--
-- Name: outreach_send_queue outreach_send_queue_prospect_id_follow_up_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_send_queue
    ADD CONSTRAINT outreach_send_queue_prospect_id_follow_up_number_key UNIQUE (prospect_id, follow_up_number);


--
-- Name: outreach_sends outreach_sends_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_message_id_key UNIQUE (message_id);


--
-- Name: outreach_sends outreach_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_pkey PRIMARY KEY (id);


--
-- Name: outreach_sends outreach_sends_prospect_id_follow_up_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_prospect_id_follow_up_number_key UNIQUE (prospect_id, follow_up_number);


--
-- Name: outreach_sends outreach_sends_reply_to_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_reply_to_token_key UNIQUE (reply_to_token);


--
-- Name: outreach_sends outreach_sends_tracking_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_tracking_token_key UNIQUE (tracking_token);


--
-- Name: payment_refunds payment_refunds_paypal_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT payment_refunds_paypal_event_id_key UNIQUE (paypal_event_id);


--
-- Name: payment_refunds payment_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT payment_refunds_pkey PRIMARY KEY (id);


--
-- Name: payments payments_paypal_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_paypal_event_id_key UNIQUE (paypal_event_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: preview_events preview_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_events
    ADD CONSTRAINT preview_events_pkey PRIMARY KEY (id);


--
-- Name: preview_links preview_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_links
    ADD CONSTRAINT preview_links_pkey PRIMARY KEY (id);


--
-- Name: preview_links preview_links_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_links
    ADD CONSTRAINT preview_links_token_hash_key UNIQUE (token_hash);


--
-- Name: preview_measurements preview_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_measurements
    ADD CONSTRAINT preview_measurements_pkey PRIMARY KEY (slug);


--
-- Name: preview_otps preview_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_otps
    ADD CONSTRAINT preview_otps_pkey PRIMARY KEY (email);


--
-- Name: price_overrides price_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_overrides
    ADD CONSTRAINT price_overrides_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_uploads project_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_uploads
    ADD CONSTRAINT project_uploads_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_counters rate_limit_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_counters
    ADD CONSTRAINT rate_limit_counters_pkey PRIMARY KEY (bucket);


--
-- Name: referral_clicks referral_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_clicks
    ADD CONSTRAINT referral_clicks_pkey PRIMARY KEY (id);


--
-- Name: referral_conversions referral_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_pkey PRIMARY KEY (id);


--
-- Name: revision_messages revision_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_messages
    ADD CONSTRAINT revision_messages_pkey PRIMARY KEY (id);


--
-- Name: scheduled_proposals scheduled_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_proposals
    ADD CONSTRAINT scheduled_proposals_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (name);


--
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: strata_events strata_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strata_events
    ADD CONSTRAINT strata_events_pkey PRIMARY KEY (id);


--
-- Name: strata_recordings strata_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strata_recordings
    ADD CONSTRAINT strata_recordings_pkey PRIMARY KEY (id);


--
-- Name: strata_sessions strata_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strata_sessions
    ADD CONSTRAINT strata_sessions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: template_files template_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_files
    ADD CONSTRAINT template_files_pkey PRIMARY KEY (id);


--
-- Name: template_files template_files_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_files
    ADD CONSTRAINT template_files_template_id_key UNIQUE (template_id);


--
-- Name: template_purchases template_purchases_paypal_capture_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_purchases
    ADD CONSTRAINT template_purchases_paypal_capture_id_key UNIQUE (paypal_capture_id);


--
-- Name: template_purchases template_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_purchases
    ADD CONSTRAINT template_purchases_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_sessions_active_idx ON public.admin_sessions USING btree (token_hash) WHERE (revoked_at IS NULL);


--
-- Name: admin_sessions_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_sessions_expires_idx ON public.admin_sessions USING btree (expires_at);


--
-- Name: email_failures_recipient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_failures_recipient_idx ON public.email_failures USING btree (recipient);


--
-- Name: email_failures_unresolved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_failures_unresolved_idx ON public.email_failures USING btree (created_at DESC) WHERE (resolved_at IS NULL);


--
-- Name: file_store_orphan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX file_store_orphan_idx ON public.file_store USING btree (created_at) WHERE (project_id IS NULL);


--
-- Name: file_store_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX file_store_project_idx ON public.file_store USING btree (project_id);


--
-- Name: idx_affiliates_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliates_auth_user_id ON public.affiliates USING btree (auth_user_id);


--
-- Name: idx_affiliates_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliates_referral_code ON public.affiliates USING btree (referral_code);


--
-- Name: idx_ai_chat_usage_project_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_usage_project_date ON public.ai_chat_usage USING btree (project_id, date);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_auth_email_verifications_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_email_verifications_token_hash ON public.auth_email_verifications USING btree (token_hash);


--
-- Name: idx_auth_magic_links_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_magic_links_expires_at ON public.auth_magic_links USING btree (expires_at);


--
-- Name: idx_auth_magic_links_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_magic_links_token_hash ON public.auth_magic_links USING btree (token_hash);


--
-- Name: idx_auth_mfa_factors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_mfa_factors_user_id ON public.auth_mfa_factors USING btree (user_id);


--
-- Name: idx_auth_password_resets_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_password_resets_token_hash ON public.auth_password_resets USING btree (token_hash);


--
-- Name: idx_auth_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_expires_at ON public.auth_sessions USING btree (expires_at);


--
-- Name: idx_auth_sessions_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_token_hash ON public.auth_sessions USING btree (token_hash);


--
-- Name: idx_auth_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_user_id ON public.auth_sessions USING btree (user_id);


--
-- Name: idx_auth_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_email ON public.auth_users USING btree (email);


--
-- Name: idx_banned_emails_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banned_emails_email ON public.banned_emails USING btree (email);


--
-- Name: idx_brief_submissions_demo_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brief_submissions_demo_reference ON public.brief_submissions USING btree (demo_reference);


--
-- Name: idx_brief_submissions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brief_submissions_project_id ON public.brief_submissions USING btree (project_id);


--
-- Name: idx_clients_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_email ON public.clients USING btree (email);


--
-- Name: idx_demo_license_devices_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_license_devices_active ON public.demo_license_devices USING btree (license_id) WHERE (revoked_at IS NULL);


--
-- Name: idx_demo_license_devices_license; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_license_devices_license ON public.demo_license_devices USING btree (license_id);


--
-- Name: idx_demo_license_domains_license; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_license_domains_license ON public.demo_license_domains USING btree (license_id);


--
-- Name: idx_demo_license_downloads_license; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_license_downloads_license ON public.demo_license_downloads USING btree (license_id, downloaded_at DESC);


--
-- Name: idx_demo_licenses_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_licenses_email ON public.demo_licenses USING btree (lower(buyer_email));


--
-- Name: idx_demo_licenses_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_licenses_purchase ON public.demo_licenses USING btree (purchase_id);


--
-- Name: idx_demo_licenses_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_licenses_slug ON public.demo_licenses USING btree (demo_slug);


--
-- Name: idx_demo_licenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_licenses_status ON public.demo_licenses USING btree (status) WHERE (status = 'active'::text);


--
-- Name: idx_demo_licenses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demo_licenses_user ON public.demo_licenses USING btree (user_id);


--
-- Name: idx_email_suppressions_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_suppressions_email_lower ON public.email_suppressions USING btree (lower(email));


--
-- Name: idx_email_suppressions_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_suppressions_reason ON public.email_suppressions USING btree (reason);


--
-- Name: idx_events_open_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_events_open_dedupe ON public.outreach_events USING btree (send_id, ip_hash) WHERE ((event_type = 'open'::text) AND (ip_hash IS NOT NULL));


--
-- Name: idx_events_reply_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_reply_class ON public.outreach_events USING btree (reply_classification, created_at DESC) WHERE (event_type = 'reply'::text);


--
-- Name: idx_events_send_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_send_type_time ON public.outreach_events USING btree (send_id, event_type, created_at DESC);


--
-- Name: idx_events_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type_time ON public.outreach_events USING btree (event_type, created_at DESC);


--
-- Name: idx_events_unhandled_replies; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_unhandled_replies ON public.outreach_events USING btree (created_at DESC) WHERE ((event_type = 'reply'::text) AND (handled_at IS NULL));


--
-- Name: idx_file_store_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_store_created_at ON public.file_store USING btree (created_at);


--
-- Name: idx_mistakes_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mistakes_message_id ON public.mistakes USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_mistakes_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mistakes_project_id ON public.mistakes USING btree (project_id);


--
-- Name: idx_mistakes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mistakes_status ON public.mistakes USING btree (status);


--
-- Name: idx_onboarding_messages_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_messages_session_id ON public.onboarding_messages USING btree (session_id);


--
-- Name: idx_onboarding_sessions_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onboarding_sessions_project ON public.onboarding_sessions USING btree (project_id);


--
-- Name: idx_onboarding_sessions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_onboarding_sessions_project_id ON public.onboarding_sessions USING btree (project_id);


--
-- Name: idx_outreach_campaigns_niche; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outreach_campaigns_niche ON public.outreach_campaigns USING btree (niche);


--
-- Name: idx_outreach_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outreach_campaigns_status ON public.outreach_campaigns USING btree (status);


--
-- Name: idx_outreach_inboxes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outreach_inboxes_active ON public.outreach_inboxes USING btree (active, paused) WHERE (active = true);


--
-- Name: idx_payments_paypal_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_paypal_event_id ON public.payments USING btree (paypal_event_id);


--
-- Name: idx_payments_project_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_project_created ON public.payments USING btree (project_id, created_at DESC);


--
-- Name: idx_payments_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_project_id ON public.payments USING btree (project_id);


--
-- Name: idx_placement_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_placement_recent ON public.outreach_placement_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_preview_events_link; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preview_events_link ON public.preview_events USING btree (link_id, created_at);


--
-- Name: idx_preview_links_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preview_links_status ON public.preview_links USING btree (status);


--
-- Name: idx_preview_links_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preview_links_token_hash ON public.preview_links USING btree (token_hash);


--
-- Name: idx_price_overrides_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_overrides_project ON public.price_overrides USING btree (project_id);


--
-- Name: idx_price_overrides_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_overrides_status ON public.price_overrides USING btree (status);


--
-- Name: idx_project_milestones_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_milestones_project ON public.project_milestones USING btree (project_id);


--
-- Name: idx_project_milestones_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_project_milestones_unique ON public.project_milestones USING btree (project_id, milestone_type);


--
-- Name: idx_projects_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_client_id ON public.projects USING btree (client_id);


--
-- Name: idx_projects_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_referral_code ON public.projects USING btree (referral_code);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_proposals_client_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_client_email ON public.proposals USING btree (client_email);


--
-- Name: idx_proposals_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_project_id ON public.proposals USING btree (project_id);


--
-- Name: idx_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_status ON public.proposals USING btree (status);


--
-- Name: idx_prospects_campaign_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_campaign_status ON public.outreach_prospects USING btree (campaign_id, status);


--
-- Name: idx_prospects_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_email_lower ON public.outreach_prospects USING btree (lower(email));


--
-- Name: idx_prospects_last_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_last_contact ON public.outreach_prospects USING btree (last_contact_at);


--
-- Name: idx_prospects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_status ON public.outreach_prospects USING btree (status);


--
-- Name: idx_queue_claimed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_claimed ON public.outreach_send_queue USING btree (claimed_at) WHERE (status = 'sending'::text);


--
-- Name: idx_queue_pending_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_pending_scheduled ON public.outreach_send_queue USING btree (scheduled_for, priority DESC) WHERE (status = 'pending'::text);


--
-- Name: idx_queue_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_status_updated ON public.outreach_send_queue USING btree (status, updated_at DESC);


--
-- Name: idx_recordings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_created ON public.strata_recordings USING btree (created_at DESC);


--
-- Name: idx_recordings_session_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_session_seq ON public.strata_recordings USING btree (session_id, sequence);


--
-- Name: idx_recordings_site_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_site_created ON public.strata_recordings USING btree (site_id, created_at DESC);


--
-- Name: idx_referral_conversions_affiliate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_conversions_affiliate_id ON public.referral_conversions USING btree (affiliate_id);


--
-- Name: idx_referral_conversions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_conversions_status ON public.referral_conversions USING btree (status);


--
-- Name: idx_revision_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_messages_created_at ON public.revision_messages USING btree (created_at);


--
-- Name: idx_revision_messages_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_messages_project_id ON public.revision_messages USING btree (project_id);


--
-- Name: idx_scheduled_proposals_status_send_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_proposals_status_send_at ON public.scheduled_proposals USING btree (status, send_at);


--
-- Name: idx_security_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_created ON public.security_audit_log USING btree (created_at);


--
-- Name: idx_security_audit_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_email ON public.security_audit_log USING btree (email);


--
-- Name: idx_security_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_event ON public.security_audit_log USING btree (event_type);


--
-- Name: idx_security_audit_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_severity ON public.security_audit_log USING btree (severity);


--
-- Name: idx_seed_inboxes_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seed_inboxes_provider ON public.outreach_seed_inboxes USING btree (provider, active);


--
-- Name: idx_sends_campaign_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sends_campaign_date ON public.outreach_sends USING btree (campaign_id, sent_at DESC);


--
-- Name: idx_sends_inbox_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sends_inbox_date ON public.outreach_sends USING btree (inbox_id, sent_at DESC);


--
-- Name: idx_sends_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sends_message_id ON public.outreach_sends USING btree (message_id);


--
-- Name: idx_sends_prospect; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sends_prospect ON public.outreach_sends USING btree (prospect_id);


--
-- Name: idx_sends_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sends_sent_at ON public.outreach_sends USING btree (sent_at DESC);


--
-- Name: idx_sends_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sends_tracking ON public.outreach_sends USING btree (tracking_token);


--
-- Name: idx_sessions_finalized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_finalized ON public.strata_sessions USING btree (is_finalized, finalized_at DESC);


--
-- Name: idx_sessions_has_recording; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_has_recording ON public.strata_sessions USING btree (has_recording) WHERE (has_recording = true);


--
-- Name: idx_strata_events_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_country ON public.strata_events USING btree (country, created_at DESC);


--
-- Name: idx_strata_events_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_ip ON public.strata_events USING btree (ip_address);


--
-- Name: idx_strata_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_session ON public.strata_events USING btree (session_id);


--
-- Name: idx_strata_events_site_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_site_created ON public.strata_events USING btree (site_id, created_at DESC);


--
-- Name: idx_strata_events_site_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_site_session ON public.strata_events USING btree (site_id, session_id);


--
-- Name: idx_strata_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_type ON public.strata_events USING btree (event_type, created_at DESC);


--
-- Name: idx_strata_events_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_events_url ON public.strata_events USING btree (url, created_at DESC);


--
-- Name: idx_strata_sessions_bounce; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_sessions_bounce ON public.strata_sessions USING btree (site_id, is_bounce);


--
-- Name: idx_strata_sessions_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_sessions_country ON public.strata_sessions USING btree (country);


--
-- Name: idx_strata_sessions_geo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_sessions_geo ON public.strata_sessions USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_strata_sessions_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_sessions_ip ON public.strata_sessions USING btree (ip_address);


--
-- Name: idx_strata_sessions_site_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strata_sessions_site_started ON public.strata_sessions USING btree (site_id, started_at DESC);


--
-- Name: idx_tasks_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tasks_message_id ON public.tasks USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_template_files_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_files_plan ON public.template_files USING btree (plan);


--
-- Name: idx_template_files_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_files_template_id ON public.template_files USING btree (template_id);


--
-- Name: idx_template_purchases_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_purchases_email ON public.template_purchases USING btree (buyer_email);


--
-- Name: idx_template_purchases_paypal_capture; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_purchases_paypal_capture ON public.template_purchases USING btree (paypal_capture_id);


--
-- Name: idx_template_purchases_paypal_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_purchases_paypal_order ON public.template_purchases USING btree (paypal_order_id);


--
-- Name: idx_uploads_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_category ON public.project_uploads USING btree (category);


--
-- Name: idx_uploads_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_project ON public.project_uploads USING btree (project_id);


--
-- Name: idx_validations_license_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validations_license_time ON public.demo_license_validations USING btree (license_id, created_at DESC);


--
-- Name: idx_validations_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validations_result ON public.demo_license_validations USING btree (result, created_at DESC) WHERE (result <> 'ok'::text);


--
-- Name: ip_reputation_last_seen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ip_reputation_last_seen_idx ON public.ip_reputation USING btree (last_seen DESC);


--
-- Name: ip_reputation_offense_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ip_reputation_offense_idx ON public.ip_reputation USING btree (offense_count DESC);


--
-- Name: payment_refunds_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_refunds_project_id_idx ON public.payment_refunds USING btree (project_id);


--
-- Name: payments_paypal_capture_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_paypal_capture_id_key ON public.payments USING btree (paypal_capture_id) WHERE (paypal_capture_id IS NOT NULL);


--
-- Name: projects_site_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX projects_site_id_key ON public.projects USING btree (site_id) WHERE (site_id IS NOT NULL);


--
-- Name: rate_limit_counters_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_limit_counters_expires_at_idx ON public.rate_limit_counters USING btree (expires_at);


--
-- Name: referral_clicks_affiliate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_clicks_affiliate_idx ON public.referral_clicks USING btree (affiliate_id, created_at DESC);


--
-- Name: referral_conversions_project_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referral_conversions_project_id_key ON public.referral_conversions USING btree (project_id);


--
-- Name: scheduled_proposals_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_proposals_due_idx ON public.scheduled_proposals USING btree (send_at) WHERE (status = 'pending'::text);


--
-- Name: security_audit_log_id_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_audit_log_id_desc_idx ON public.security_audit_log USING btree (id DESC);


--
-- Name: strata_events_ip_retention_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strata_events_ip_retention_idx ON public.strata_events USING btree (created_at) WHERE (ip_address IS NOT NULL);


--
-- Name: strata_sessions_ip_retention_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strata_sessions_ip_retention_idx ON public.strata_sessions USING btree (created_at) WHERE (ip_address IS NOT NULL);


--
-- Name: auth_users auth_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auth_users_updated_at BEFORE UPDATE ON public.auth_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_milestones project_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_milestone_updated_at();


--
-- Name: proposals proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mistakes update_mistakes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mistakes_updated_at BEFORE UPDATE ON public.mistakes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: affiliates affiliates_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: ai_chat_usage ai_chat_usage_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_usage
    ADD CONSTRAINT ai_chat_usage_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: auth_email_verifications auth_email_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_email_verifications
    ADD CONSTRAINT auth_email_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_mfa_factors auth_mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_mfa_factors
    ADD CONSTRAINT auth_mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_password_resets auth_password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_password_resets
    ADD CONSTRAINT auth_password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: brief_submissions brief_submissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_submissions
    ADD CONSTRAINT brief_submissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: demo_license_devices demo_license_devices_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_devices
    ADD CONSTRAINT demo_license_devices_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.demo_licenses(id) ON DELETE CASCADE;


--
-- Name: demo_license_domains demo_license_domains_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_domains
    ADD CONSTRAINT demo_license_domains_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.demo_licenses(id) ON DELETE CASCADE;


--
-- Name: demo_license_downloads demo_license_downloads_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_downloads
    ADD CONSTRAINT demo_license_downloads_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.demo_licenses(id) ON DELETE CASCADE;


--
-- Name: demo_license_validations demo_license_validations_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_validations
    ADD CONSTRAINT demo_license_validations_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.demo_license_devices(id) ON DELETE SET NULL;


--
-- Name: demo_license_validations demo_license_validations_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_license_validations
    ADD CONSTRAINT demo_license_validations_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.demo_licenses(id) ON DELETE CASCADE;


--
-- Name: demo_licenses demo_licenses_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_licenses
    ADD CONSTRAINT demo_licenses_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.template_purchases(id) ON DELETE SET NULL;


--
-- Name: demo_licenses demo_licenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_licenses
    ADD CONSTRAINT demo_licenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: file_store file_store_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_store
    ADD CONSTRAINT file_store_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: scheduled_proposals fk_scheduled_proposals_project; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_proposals
    ADD CONSTRAINT fk_scheduled_proposals_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: mistakes mistakes_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mistakes
    ADD CONSTRAINT mistakes_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.revision_messages(id) ON DELETE SET NULL;


--
-- Name: mistakes mistakes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mistakes
    ADD CONSTRAINT mistakes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: onboarding_messages onboarding_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_messages
    ADD CONSTRAINT onboarding_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE;


--
-- Name: onboarding_sessions onboarding_sessions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_sessions
    ADD CONSTRAINT onboarding_sessions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: outreach_events outreach_events_send_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_events
    ADD CONSTRAINT outreach_events_send_id_fkey FOREIGN KEY (send_id) REFERENCES public.outreach_sends(id) ON DELETE CASCADE;


--
-- Name: outreach_placement_snapshots outreach_placement_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_placement_snapshots
    ADD CONSTRAINT outreach_placement_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE;


--
-- Name: outreach_placement_snapshots outreach_placement_snapshots_inbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_placement_snapshots
    ADD CONSTRAINT outreach_placement_snapshots_inbox_id_fkey FOREIGN KEY (inbox_id) REFERENCES public.outreach_inboxes(id) ON DELETE CASCADE;


--
-- Name: outreach_prospects outreach_prospects_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_prospects
    ADD CONSTRAINT outreach_prospects_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL;


--
-- Name: outreach_send_queue outreach_send_queue_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_send_queue
    ADD CONSTRAINT outreach_send_queue_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.outreach_campaigns(id);


--
-- Name: outreach_send_queue outreach_send_queue_inbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_send_queue
    ADD CONSTRAINT outreach_send_queue_inbox_id_fkey FOREIGN KEY (inbox_id) REFERENCES public.outreach_inboxes(id);


--
-- Name: outreach_send_queue outreach_send_queue_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_send_queue
    ADD CONSTRAINT outreach_send_queue_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.outreach_prospects(id) ON DELETE CASCADE;


--
-- Name: outreach_sends outreach_sends_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.outreach_campaigns(id);


--
-- Name: outreach_sends outreach_sends_inbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_inbox_id_fkey FOREIGN KEY (inbox_id) REFERENCES public.outreach_inboxes(id);


--
-- Name: outreach_sends outreach_sends_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outreach_sends
    ADD CONSTRAINT outreach_sends_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.outreach_prospects(id) ON DELETE CASCADE;


--
-- Name: payment_refunds payment_refunds_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT payment_refunds_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: payments payments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: preview_events preview_events_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_events
    ADD CONSTRAINT preview_events_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.preview_links(id) ON DELETE CASCADE;


--
-- Name: preview_links preview_links_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preview_links
    ADD CONSTRAINT preview_links_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: price_overrides price_overrides_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_overrides
    ADD CONSTRAINT price_overrides_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_uploads project_uploads_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_uploads
    ADD CONSTRAINT project_uploads_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: projects projects_referral_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES public.affiliates(referral_code) ON DELETE SET NULL;


--
-- Name: proposals proposals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: referral_clicks referral_clicks_affiliate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_clicks
    ADD CONSTRAINT referral_clicks_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;


--
-- Name: referral_conversions referral_conversions_affiliate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;


--
-- Name: referral_conversions referral_conversions_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


--
-- Name: referral_conversions referral_conversions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: revision_messages revision_messages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_messages
    ADD CONSTRAINT revision_messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.revision_messages(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict CuqiVXMDXGw4ZxlwvpJGOm9k3BbsrkxBiiM4lb2giOR3HTAkZl201w3YLjXzScW

