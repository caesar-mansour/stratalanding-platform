-- 050: Per-tenant email suppression (audit F43 / F80).
--
-- ⚠️ REVIEW BEFORE RUNNING — apply this ONLY together with the outreach tenant-scoping code work
-- (F80: thread a real user_id through src/lib/suppressions.ts + the outreach data layer). Today
-- there is a single tenant (the founder), so the global UNIQUE(email) is functionally fine and the
-- app's ON CONFLICT (email) upsert depends on it. The moment a SECOND subscriber exists, a global
-- suppression list lets one tenant's unsubscribe block every tenant — that's what this fixes.
--
-- Steps (run in a transaction after confirming no cross-user duplicate emails):
--   1. Check for dupes that would block the new unique index:
--        SELECT user_id, email, count(*) FROM email_suppressions GROUP BY 1,2 HAVING count(*) > 1;
--   2. Drop the global uniqueness and add per-(user_id,email) uniqueness:

-- ALTER TABLE email_suppressions DROP CONSTRAINT IF EXISTS email_suppressions_email_key;
-- DROP INDEX IF EXISTS email_suppressions_email_key;
-- CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_user_email_key
--   ON email_suppressions (user_id, email);

--   3. Then switch src/lib/suppressions.ts addSuppression() to `ON CONFLICT (user_id, email)` and
--      pass the authenticated tenant's user_id (not the hardcoded founder id).
