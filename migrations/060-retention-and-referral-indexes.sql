-- 060: Indexes for the IP-retention purge and the partner dashboard (audit 2026-08-12, P3).
--
-- 1) /api/cron/purge-ips runs
--        UPDATE strata_events SET ip_address = NULL
--        WHERE ip_address IS NOT NULL AND created_at < <30 days ago>
--    and the same for strata_sessions.
--
--    Both tables DO have an index on ip_address alone (idx_strata_events_ip,
--    idx_strata_sessions_ip), which is why this was not obvious — but a plain btree on a column
--    that is almost always non-NULL cannot serve this predicate. Postgres falls back to a
--    sequential scan over every analytics row ever collected, every run, to find the shrinking
--    set that still has an IP. A PARTIAL index on created_at, restricted to rows that still
--    carry an IP, matches the query exactly and shrinks as the purge does its job.
--
--    This matters for cost, not just speed: analytics tables grow without bound, and this is a
--    scheduled job on a Neon instance that bills for compute.
--
-- 2) referral_clicks had ONLY a primary key, while the partner dashboard aggregates clicks by
--    affiliate_id. Every dashboard load scanned the whole table.
--
-- Apply against the live Neon database. Idempotent (IF NOT EXISTS), safe to re-run.

CREATE INDEX IF NOT EXISTS strata_events_ip_retention_idx
  ON strata_events (created_at)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS strata_sessions_ip_retention_idx
  ON strata_sessions (created_at)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS referral_clicks_affiliate_idx
  ON referral_clicks (affiliate_id, created_at DESC);
