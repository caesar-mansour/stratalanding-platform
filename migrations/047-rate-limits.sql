-- 047: Durable rate-limit counters (audit F9).
--
-- The previous limiter was an in-memory Map (`src/lib/rate-limit.ts`) that resets on every
-- Netlify serverless cold start and is not shared across instances — so every limit
-- (login, signup, OTP, email) was bypassable by spreading requests across cold instances.
-- This table makes the authoritative counter durable + shared. The in-memory limiter stays
-- as an L1 fast-reject in front of it to bound DB writes.
--
-- Apply against the live Neon database. Idempotent (IF NOT EXISTS), safe to re-run.

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket        TEXT PRIMARY KEY,          -- e.g. "login:ip:1.2.3.4" / "otp:email:foo@bar.com"
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  count         INT NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL
);

-- Lets the purge cron (cron/analytics-purge-ips) cheaply delete elapsed windows.
CREATE INDEX IF NOT EXISTS rate_limit_counters_expires_at_idx
  ON rate_limit_counters (expires_at);
