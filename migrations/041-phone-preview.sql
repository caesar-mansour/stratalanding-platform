-- Phone-outreach lead pipeline: allow 'phone' as a project source, track spec-preview
-- approval (also used to open chat for phone leads before any deposit), and store the
-- per-practice preview tokens the founder sends from a call. All additive — existing
-- brief/quote flows are unchanged.

-- 1. Allow 'phone' as a project source (extends migrations/020-add-source-to-projects.sql)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_source_check;
ALTER TABLE projects ADD CONSTRAINT projects_source_check CHECK (source IN ('brief', 'quote', 'phone'));

-- 2. When a phone lead approved their spec preview (NULL = not yet / not a phone lead)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preview_approved_at TIMESTAMPTZ;

-- 3. Preview links — one token per practice the founder sends after a call.
--    Token is stored hashed (sha256), like auth_magic_links.
CREATE TABLE IF NOT EXISTS preview_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    TEXT NOT NULL UNIQUE,
  practice_name TEXT NOT NULL,
  slug          TEXT NOT NULL,
  preview_url   TEXT NOT NULL,
  package       TEXT NOT NULL DEFAULT 'growth' CHECK (package IN ('starter', 'growth', 'scale')),
  contact_email TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'liked', 'approved', 'declined', 'exploring')),
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preview_links_token_hash ON preview_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_preview_links_status ON preview_links(status);
