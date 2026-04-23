-- Store rendered review email on schedule so SES can send later (no Resend scheduled send).
-- Safe to run multiple times.

ALTER TABLE review_email_sends
  ADD COLUMN IF NOT EXISTS email_subject TEXT;

ALTER TABLE review_email_sends
  ADD COLUMN IF NOT EXISTS email_html TEXT;

ALTER TABLE review_email_sends
  ADD COLUMN IF NOT EXISTS email_from TEXT;
