-- Add cancellation support and provider IDs for review email schedules.
-- Safe to run multiple times.

ALTER TABLE review_email_sends
  ADD COLUMN IF NOT EXISTS resend_email_id VARCHAR(255);

ALTER TABLE review_email_sends
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE review_email_sends
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'review_email_sends_status_check'
      AND conrelid = 'review_email_sends'::regclass
  ) THEN
    ALTER TABLE review_email_sends
      DROP CONSTRAINT review_email_sends_status_check;
  END IF;
END $$;

ALTER TABLE review_email_sends
  ADD CONSTRAINT review_email_sends_status_check
  CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_review_email_sends_resend_email_id
  ON review_email_sends(resend_email_id);
