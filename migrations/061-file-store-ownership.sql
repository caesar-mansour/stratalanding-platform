-- 061: Explicit ownership and lifecycle for stored file bytes (audit 2026-08-12).
--
-- THE PROBLEM
-- `file_store` held the actual bytes (BYTEA) with columns: storage_key, file_data, content_type,
-- file_size, created_at. No owner column, no foreign key, no lifecycle.
--
-- Authorization still worked — but only because it PARSED the project id out of the storage key
-- string (`project-files/{projectId}/…`, `uploads/chat/{projectId}/…`). That is a convention, not
-- a constraint: any key written without it silently falls outside the check, and nothing in the
-- database prevents that. Authorization should be a JOIN, not a string parse.
--
-- And because there was no FK, deleting a project left its bytes behind forever. `project_uploads`
-- (the metadata) cascades; the bytes it pointed at did not.
--
-- WHY BYTEA IS KEPT
-- The stack was inspected for existing object storage before changing anything: there is none
-- configured, and no blob client is a dependency. Introducing one would add a new external
-- failure mode and a second consistency boundary to a system that currently stores files with a
-- 5 MB cap for a handful of clients. Postgres BYTEA at that scale is production-grade — it is
-- backed up with everything else and it is transactional with the metadata, which an object store
-- is not. The real defects the audit named were ownership, authorization, and lifecycle, and those
-- are fixed here. Revisit the medium if file volume ever grows past a few GB.
--
-- MIGRATION SAFETY: both file_store and project_uploads currently contain ZERO rows, so there is
-- no backfill and no risk of orphaning existing data. The column is added NULLable for exactly
-- that reason — a legacy key written before this migration must not break reads.
--
-- Apply against the live Neon database. Idempotent, safe to re-run.

ALTER TABLE file_store ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE file_store ADD COLUMN IF NOT EXISTS uploaded_by text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'file_store'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'file_store_project_id_fkey'
  ) THEN
    -- CASCADE, unlike payments (057, RESTRICT): a deleted project's FILES should go with it.
    -- Files are client-supplied working material, not a financial record — keeping orphaned bytes
    -- around is a storage leak and a privacy problem, not an audit trail.
    ALTER TABLE file_store
      ADD CONSTRAINT file_store_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Authorization joins on this; without it every file read scans the table.
CREATE INDEX IF NOT EXISTS file_store_project_idx ON file_store (project_id);

-- Retention sweeps look for old rows with no owning project.
CREATE INDEX IF NOT EXISTS file_store_orphan_idx
  ON file_store (created_at)
  WHERE project_id IS NULL;
