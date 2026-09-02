-- 051: Elite security platform — tamper-evident audit log + IP reputation.
-- Backend/database only; nothing here is visitor-facing.
--
-- Apply against the live Neon database (and local 2719). Idempotent, safe to re-run.

-- ── Tamper-evident audit log (hash chain) ──────────────────────────────────────
-- Each security_audit_log row is chained to the previous one: entry_hash =
-- sha256(canonical(row) || prev_hash). A deleted or edited row breaks the chain, so an
-- attacker who reaches the DB can't quietly erase their tracks. See src/lib/security/audit-log.ts.
ALTER TABLE security_audit_log ADD COLUMN IF NOT EXISTS prev_hash  TEXT;
ALTER TABLE security_audit_log ADD COLUMN IF NOT EXISTS entry_hash TEXT;
-- Fast "latest entry" lookup for chaining + verification.
CREATE INDEX IF NOT EXISTS security_audit_log_id_desc_idx ON security_audit_log (id DESC);

-- ── IP reputation (durable offender tracking) ──────────────────────────────────
-- The edge WAF blocks statelessly; this table accumulates the durable record the
-- Security Command Center shows (top offenders) and can later drive cross-instance blocks.
CREATE TABLE IF NOT EXISTS ip_reputation (
  ip            TEXT PRIMARY KEY,
  offense_count INT NOT NULL DEFAULT 0,
  last_rule     TEXT,
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ip_reputation_last_seen_idx ON ip_reputation (last_seen DESC);
CREATE INDEX IF NOT EXISTS ip_reputation_offense_idx ON ip_reputation (offense_count DESC);
