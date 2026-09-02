-- Add source column to projects to distinguish briefs from quotes
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'brief' CHECK (source IN ('brief', 'quote'));

-- Backfill: mark existing projects that came from quotes
-- (Quote submissions have "Project Type:" in their brief notes)
UPDATE projects p
SET source = 'quote'
FROM brief_submissions bs
WHERE bs.project_id = p.id
  AND bs.notes LIKE '%Project Type:%';
