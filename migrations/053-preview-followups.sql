-- 053 — Manual follow-up emails for phone-lead preview links.
-- Records when the founder sent a follow-up to a lead (and how many), so the Phone Leads
-- dashboard can show a "Followed up ✓" badge. All additive.

ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS followed_up_at timestamptz;                 -- last follow-up email sent
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS followup_count integer NOT NULL DEFAULT 0;  -- how many follow-ups sent
