-- 058: Revocable server-side admin sessions (audit 2026-08-12, P1 A-01).
--
-- The admin gate worked like this: on successful login the route echoed the submitted token —
-- which had just been byte-compared against ADMIN_ACCESS_TOKEN, so it WAS the env secret — straight
-- back as the `admin_token` cookie value. verifyAdmin() then re-compared that cookie to the same
-- env var. There was no server-side session record, no expiry claim the server enforced (maxAge is
-- a browser hint only), and no revocation: DELETE /api/admin/auth merely cleared the local cookie.
--
-- So a single capture of that cookie — shared laptop, browser profile sync, a screen share, a
-- debugging proxy, a malicious extension — was permanent, unrevocable, full admin access to every
-- client record, brief, payment and proposal. The only remedy was rotating the env var in Netlify
-- and redeploying, and nothing anywhere recorded that it had happened.
--
-- This table makes admin sessions real objects: individually expiring, individually revocable, and
-- enumerable so the founder can see and kill every active session.
--
-- Only the SHA-256 hash of the session token is stored, so a database leak does not yield usable
-- admin cookies.
--
-- Apply against the live Neon database. Idempotent (IF NOT EXISTS), safe to re-run.

CREATE TABLE IF NOT EXISTS admin_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

-- The hot path is "look this cookie up and decide if it is still valid".
CREATE INDEX IF NOT EXISTS admin_sessions_active_idx
  ON admin_sessions (token_hash)
  WHERE revoked_at IS NULL;

-- For the "show me active sessions / expire old rows" queries.
CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx
  ON admin_sessions (expires_at);
