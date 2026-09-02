-- 057: Stop project deletion from destroying financial records (audit 2026-08-12, P1 F-01).
--
-- `payments.project_id` was ON DELETE CASCADE, and the admin delete route relied on it:
--   "Now delete the project (brief_submissions, payments, uploads, messages cascade automatically)"
-- So deleting a project silently destroyed every payment row attached to it — the captured amount,
-- the PayPal capture id, the currency, the timestamp. That is the only record the business has that
-- money was ever received. It is needed for accounting, for tax, and to defend a PayPal dispute or
-- chargeback (which can be filed up to 180 days later, long after a project might be tidied away).
--
-- RESTRICT is deliberate over SET NULL: a payment that is not attached to a project is not
-- auditable either. The application now refuses the delete with an explanation instead, so the
-- founder makes a conscious decision rather than losing records to a cascade they cannot see.
--
-- Apply against the live Neon database. Idempotent, safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'payments'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND rc.delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_project_id_fkey;
    ALTER TABLE payments
      ADD CONSTRAINT payments_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- payment_refunds must survive for the same reason: a refund/chargeback ledger that cannot be
-- reconciled against PayPal is worthless.
--
-- Note the different failure mode here. Unlike payments, payment_refunds.project_id had NO foreign
-- key at all — so refund rows were never cascade-deleted, but nothing stopped them pointing at a
-- project id that no longer exists. Adding the constraint closes that hole and gives refunds the
-- same RESTRICT protection. Verified zero orphaned rows before adding it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payment_refunds'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'payment_refunds_project_id_fkey'
  ) THEN
    ALTER TABLE payment_refunds
      ADD CONSTRAINT payment_refunds_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;
  END IF;
END $$;
