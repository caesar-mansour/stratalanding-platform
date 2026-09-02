-- 048: Refund/chargeback handling + commission void + single-use download token.
-- Audit F58 (no refund handling), F81 (commission void on refund), F85 (replayable download token).
--
-- Apply against the live Neon database. Idempotent, safe to re-run.

-- ── Commission void support (F58/F81) ──────────────────────────────────────────
-- Lets a refund/chargeback mark a previously-credited commission as voided instead of
-- silently leaving it payable.
ALTER TABLE referral_conversions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';  -- active | voided

-- ── Refund / reversal / dispute ledger (F58) ───────────────────────────────────
-- The PayPal webhook records each refund/reversal/dispute here (idempotent on event id),
-- reverts the project to a pre-paid state, and voids the commission. Kept in its own table
-- so we don't fight any CHECK constraint on payments.type.
CREATE TABLE IF NOT EXISTS payment_refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID,
  paypal_event_id TEXT UNIQUE,          -- idempotency key
  raw_capture_id  TEXT,                 -- the original capture this refers to (best-effort)
  kind            TEXT NOT NULL,        -- refund | reversal | dispute
  amount_cents    INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_refunds_project_id_idx ON payment_refunds (project_id);

-- ── Single-use template download token (F85) ───────────────────────────────────
-- The 72h download token was an unrevocable replayable bearer. This column lets the
-- delivery layer mark a token consumed so it can't be reused after the first download.
ALTER TABLE template_purchases
  ADD COLUMN IF NOT EXISTS download_consumed_at TIMESTAMPTZ;
