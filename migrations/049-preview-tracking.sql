-- 049 — Passive engagement tracking for phone-lead preview links.
-- Answers, per link the founder sent after a cold call: did they OPEN it, did they click
-- through to the actual spec WEBSITE, how far did they SCROLL, how long did they STAY, and
-- when did they LEAVE. All additive — the existing preview flow is untouched.
--
-- Two surfaces are tracked, both beaconing to /api/preview/track keyed by the link's id:
--   'gate' = the stratalanding.com/preview/<token> welcome page (same origin)
--   'site' = the previews.example.com spec website (opened via ?sv=<link id>)

CREATE TABLE IF NOT EXISTS preview_events (
  id          bigserial PRIMARY KEY,
  link_id     uuid NOT NULL REFERENCES preview_links(id) ON DELETE CASCADE,
  kind        text NOT NULL,                 -- open | view_site | site_open | scroll | dwell | stage | hide | return
  surface     text NOT NULL DEFAULT 'gate',  -- 'gate' (the /preview page) | 'site' (the spec website)
  scroll_pct  smallint,                      -- 0..100, for scroll events
  seconds     integer,                       -- cumulative active-on-page seconds, for dwell events
  stage       text,                          -- gate micro-commit stage, for stage events
  ua          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_preview_events_link ON preview_events(link_id, created_at);

-- Denormalized rollups on the link so the admin dashboard reads engagement in one query.
-- Maintained by the track endpoint (monotonic: timestamps set once, scroll/seconds keep the max).
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS first_opened_at  timestamptz;                 -- first time the gate page loaded
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS last_seen_at     timestamptz;                 -- most recent beacon of any kind
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS open_count       integer  NOT NULL DEFAULT 0; -- number of gate opens
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS viewed_site_at   timestamptz;                 -- clicked "View your new website"
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS site_reached_at  timestamptz;                 -- the spec website actually loaded
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS gate_scroll_pct  smallint NOT NULL DEFAULT 0; -- deepest scroll on the gate page
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS site_scroll_pct  smallint NOT NULL DEFAULT 0; -- deepest scroll on the spec website
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS gate_seconds     integer  NOT NULL DEFAULT 0; -- active seconds on the gate page
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS site_seconds     integer  NOT NULL DEFAULT 0; -- active seconds on the spec website
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS last_stage       text;                        -- furthest micro-commit stage reached
