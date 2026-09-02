-- 045: Security-hardening DB constraints (audit F49 / F51 / F70 / F81).
--
-- Apply against the live Neon database. Idempotent (IF NOT EXISTS) and safe to re-run.
-- ⚠️ If any CREATE UNIQUE INDEX fails, it means existing duplicate rows exist — dedupe
--    those first (queries below) then re-run. For a pre-revenue DB this should be a no-op.

-- ── Payment idempotency ────────────────────────────────────────────────────────
-- The webhook + capture-order both rely on "process each PayPal event/capture once".
-- These unique indexes make that race-safe at the DB layer (audit F51/F49).
-- Check for dupes first:  SELECT paypal_event_id, count(*) FROM payments GROUP BY 1 HAVING count(*)>1;
CREATE UNIQUE INDEX IF NOT EXISTS payments_paypal_event_id_key
  ON payments (paypal_event_id) WHERE paypal_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_paypal_capture_id_key
  ON payments (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;

-- ── One commission per project (audit F81) ─────────────────────────────────────
-- Prevents a second `final` event from double-crediting an affiliate.
-- Check:  SELECT project_id, count(*) FROM referral_conversions GROUP BY 1 HAVING count(*)>1;
CREATE UNIQUE INDEX IF NOT EXISTS referral_conversions_project_id_key
  ON referral_conversions (project_id);

-- ── site_id uniqueness (audit F70) ─────────────────────────────────────────────
-- site_id is now 64-bit (16 hex) in code; this guarantees no collision.
-- Check:  SELECT site_id, count(*) FROM projects WHERE site_id IS NOT NULL GROUP BY 1 HAVING count(*)>1;
CREATE UNIQUE INDEX IF NOT EXISTS projects_site_id_key
  ON projects (site_id) WHERE site_id IS NOT NULL;

-- ── Per-tenant suppression (audit F43) — REVIEW BEFORE RUNNING ─────────────────
-- The outreach suppression list is currently UNIQUE(email) globally, so one tenant's
-- unsubscribe blocks every tenant. Convert to per-user. ONLY safe once you confirm there
-- are no cross-user duplicate emails. Uncomment after reviewing:
--
--   SELECT user_id, email, count(*) FROM email_suppressions GROUP BY 1,2 HAVING count(*)>1;
--   ALTER TABLE email_suppressions DROP CONSTRAINT IF EXISTS email_suppressions_email_key;
--   CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_user_email_key
--     ON email_suppressions (user_id, email);
