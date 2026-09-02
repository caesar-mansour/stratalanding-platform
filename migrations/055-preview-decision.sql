-- Record the prospect's "yes" the moment they ask for the proposal (BEFORE the email
-- code verifies), so a slow or mistyped inbox can never lose the decision. Also store
-- which address the decision actually came from — pass-along leads (office manager →
-- doctor) may answer from a different email than the link was sent to.

ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS decision_email TEXT;
ALTER TABLE preview_links ADD COLUMN IF NOT EXISTS yes_at TIMESTAMPTZ;
