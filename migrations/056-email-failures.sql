-- 056: Durable dead-letter log for failed transactional email (audit 2026-08-12, P1 E-01).
--
-- `sendEmail` returns { success, error } and never throws. Most callers ignored the result, and
-- the only trace of a failure was a console.error in a serverless log nobody reads. A total email
-- outage — an expired GMAIL_REFRESH_TOKEN, a revoked OAuth grant, a Gmail quota block — was
-- therefore completely silent: proposals, payment confirmations and magic links would simply stop
-- arriving while the app kept returning 200s.
--
-- This table is the observable record. Every send failure lands here with enough context to
-- retry or hand-send it, and the admin security page can surface a non-zero recent count.
--
-- Apply against the live Neon database. Idempotent (IF NOT EXISTS), safe to re-run.

CREATE TABLE IF NOT EXISTS email_failures (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient    text        NOT NULL,
  subject      text        NOT NULL,
  error        text        NOT NULL,
  context      text,                                  -- which flow tried to send (e.g. 'proposal', 'magic-link')
  critical     boolean     NOT NULL DEFAULT false,    -- true = a customer is actively blocked by this
  resolved_at  timestamptz,                           -- set when re-sent or handled by hand
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- The dashboard query is "unresolved failures, newest first".
CREATE INDEX IF NOT EXISTS email_failures_unresolved_idx
  ON email_failures (created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS email_failures_recipient_idx
  ON email_failures (recipient);
