-- 054: TOTP replay protection (audit M3).
--
-- The MFA verifier accepts a ±1 time-step window (~90s). Without recording which step was last
-- used, the SAME 6-digit code could be replayed within that window. This column stores the last
-- accepted time-step per factor so src/lib/auth/mfa.ts can reject any code whose step was already
-- consumed. NULL means "never used yet" (a freshly enrolled factor).
--
-- Apply against the live Neon database (and local 2719). Idempotent, safe to re-run.

ALTER TABLE auth_mfa_factors ADD COLUMN IF NOT EXISTS last_used_step BIGINT;
