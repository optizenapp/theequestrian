-- Adds job dispatch fields to email_campaign_videos so the Fargate worker
-- can pick up jobs (create / regenerate / regenerate_music / regenerate_thumbnail).
-- Idempotent.

ALTER TABLE email_campaign_videos
  ADD COLUMN IF NOT EXISTS job_kind TEXT;

ALTER TABLE email_campaign_videos
  ADD COLUMN IF NOT EXISTS job_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE email_campaign_videos
  ADD COLUMN IF NOT EXISTS job_started_at TIMESTAMPTZ;

ALTER TABLE email_campaign_videos
  ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- Allow new 'queued' status (worker picks up rows where status = 'queued')
ALTER TABLE email_campaign_videos
  DROP CONSTRAINT IF EXISTS email_campaign_videos_status_check;

ALTER TABLE email_campaign_videos
  ADD CONSTRAINT email_campaign_videos_status_check
  CHECK (status IN (
    'queued',
    'rendering',
    'render_failed',
    'ready_for_review',
    'approved',
    'rejected'
  ));

CREATE INDEX IF NOT EXISTS idx_email_campaign_videos_queue
  ON email_campaign_videos(status, updated_at)
  WHERE status = 'queued';

\echo
\echo 'Verifying...'
SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'email_campaign_videos'
    AND column_name IN ('job_kind', 'job_payload', 'job_started_at', 'worker_id')
  ORDER BY column_name;
