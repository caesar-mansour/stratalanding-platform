-- One-time email confirmation codes for the phone-preview approve step.
-- The prospect stays ON the site and types the code (no magic link, no leaving).
-- One active code per email; codes are stored hashed (sha256) and expire in 60s.

CREATE TABLE IF NOT EXISTS preview_otps (
  email        TEXT PRIMARY KEY,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
