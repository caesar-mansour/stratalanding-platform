-- 050 — Richer interaction tracking on preview links (extends 049).
-- Adds per-click detail ("did they press here and there") and a "liked" latch (did they tap
-- "I love it — let's do it"). All additive.

-- 'click' events carry the label of what was pressed (button text / link / aria-label).
ALTER TABLE preview_events ADD COLUMN IF NOT EXISTS label text;

-- Rollups on the link, maintained by the track endpoint.
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0; -- total buttons/links pressed
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS liked_at    timestamptz;                -- tapped "I love it — let's do it"
