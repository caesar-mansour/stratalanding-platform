-- 059: Allow a 'sending' state so the proposal cron can CLAIM rows (audit 2026-08-12, P2).
--
-- /api/cron/send-proposals selected pending rows and only marked them 'sent' ~90 lines later,
-- after the email had already gone out. Two overlapping runs — or one slow run still sending when
-- the next fires — both saw the same rows and both emailed the prospect the same proposal.
--
-- That was survivable while nothing invoked the route. It is not now that it runs every 15 minutes
-- (netlify/functions/cron-send-proposals.mts, added in this same remediation), so the fix and the
-- scheduler have to land together.
--
-- The route now claims rows with UPDATE ... FOR UPDATE SKIP LOCKED RETURNING, flipping them to
-- 'sending' so exactly one caller owns each row. The existing CHECK constraint did not permit that
-- value, so the claim would have failed at runtime — caught by a concurrency test before deploy.
--
-- A row left in 'sending' means that run died mid-flight. It is deliberately NOT auto-retried:
-- the failure mode worth preventing here is emailing a prospect the same proposal twice, and a
-- stuck row is visible and recoverable by hand.
--
-- Apply against the live Neon database. Idempotent, safe to re-run.

ALTER TABLE scheduled_proposals DROP CONSTRAINT IF EXISTS scheduled_proposals_status_check;

ALTER TABLE scheduled_proposals
  ADD CONSTRAINT scheduled_proposals_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text]));

-- The cron's claim query filters on (status, send_at); without this it is a sequential scan that
-- grows with every proposal ever scheduled.
CREATE INDEX IF NOT EXISTS scheduled_proposals_due_idx
  ON scheduled_proposals (send_at)
  WHERE status = 'pending';
