-- Phone-outreach leads are created passwordless (magic-link). On their first portal
-- entry we mint a password and surface it ONCE. This flag records that it was shown so
-- it never appears again. Additive; NULL = not yet issued.

ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS credentials_shown_at TIMESTAMPTZ;
