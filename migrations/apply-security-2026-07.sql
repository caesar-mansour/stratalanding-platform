-- ============================================================================
-- StrataLanding — consolidated SECURITY migration apply (2026-07-12)
-- ============================================================================
-- Applies, in order and idempotently, the security migrations that were authored
-- but (per audit) NOT YET applied to prod Neon, plus the new TOTP-replay column.
-- Every included file uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so this whole
-- script is safe to run against local :2719 AND prod Neon, and safe to RE-RUN.
--
-- Why these:
--   047  rate_limit_counters  — durable limiter table. Until applied, every protected
--                               request runs a FAILED insert (fails OPEN + burns Neon compute).
--   048  refunds + tokens      — refund/chargeback ledger, commission void, single-use download col.
--   051  security platform      — tamper-evident audit-log hash chain + ip_reputation table.
--   054  mfa replay             — auth_mfa_factors.last_used_step (TOTP replay protection).
--
-- Deliberately EXCLUDED: 050 (per-tenant suppression — body is commented-out, defer until
-- tenant #2) and the preview-feature migrations 049/052/053 (part of the live phone-lead
-- preview; confirm separately, not part of this security batch).
--
-- Run:  psql "$DATABASE_URL" -f migrations/apply-security-2026-07.sql
-- (\ir = include RELATIVE to this file's directory, so run from anywhere.)
-- ============================================================================

\set ON_ERROR_STOP on
\echo '>> Applying StrataLanding security migrations (idempotent)...'

\echo '   - 047 rate_limit_counters'
\ir 047-rate-limits.sql

\echo '   - 048 refunds + single-use download token'
\ir 048-refunds-and-tokens.sql

\echo '   - 051 tamper-evident audit log + ip_reputation'
\ir 051-security-platform.sql

\echo '   - 054 TOTP replay protection'
\ir 054-mfa-replay.sql

\echo '>> Verifying required objects exist...'
SELECT
  to_regclass('public.rate_limit_counters')                     AS rate_limit_counters,
  to_regclass('public.payment_refunds')                         AS payment_refunds,
  to_regclass('public.ip_reputation')                           AS ip_reputation,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'security_audit_log' AND column_name = 'entry_hash')       AS audit_entry_hash,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'template_purchases' AND column_name = 'download_consumed_at') AS download_consumed_at,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'auth_mfa_factors' AND column_name = 'last_used_step')      AS mfa_last_used_step;

\echo '>> Done. All four security migrations applied.'
