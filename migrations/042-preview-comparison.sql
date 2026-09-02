-- Measured before/after proof for the phone-outreach preview page.
-- Stores the prospect's current site URL and a Lighthouse comparison (real data only).
-- All additive; the preview page hides the proof block when comparison IS NULL.

ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS current_url TEXT;
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS comparison JSONB;
