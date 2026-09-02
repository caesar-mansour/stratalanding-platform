-- Per-company speed-test cache. A measurement belongs to the COMPANY (their current
-- site vs. our spec site), not to an individual preview link — so measure once and
-- every link generated for that company inherits the before/after proof.
CREATE TABLE IF NOT EXISTS preview_measurements (
  slug         text PRIMARY KEY,
  current_url  text,
  comparison   jsonb NOT NULL,
  measured_at  timestamptz NOT NULL DEFAULT now()
);
