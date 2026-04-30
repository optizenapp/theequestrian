-- Run via:
--   psql "$DATABASE_URL" -f scripts/migrate-video-social-tables.sql
-- Adds tables for campaign video generation and social publishing (idempotent).

CREATE TABLE IF NOT EXISTS email_campaign_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'rendering', 'render_failed', 'ready_for_review', 'approved', 'rejected')),
  prompt_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  render_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  s3_video_url TEXT,
  s3_thumbnail_url TEXT,
  error_message TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_videos_status
  ON email_campaign_videos(status);

CREATE TABLE IF NOT EXISTS social_channel_credentials (
  channel TEXT PRIMARY KEY CHECK (channel IN ('youtube', 'instagram', 'twitter', 'facebook')),
  account_label TEXT,
  external_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_video_id UUID NOT NULL REFERENCES email_campaign_videos(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('youtube', 'instagram', 'twitter', 'facebook')),
  variant TEXT NOT NULL CHECK (variant IN ('landscape_16_9', 'vertical_9_16')),
  status TEXT NOT NULL DEFAULT 'building'
    CHECK (status IN ('building', 'ready_for_review', 'publishing', 'published', 'publish_failed')),
  copy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_post_id TEXT,
  external_url TEXT,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_video_id, channel, variant)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_channel_status
  ON social_posts(channel, status);

CREATE INDEX IF NOT EXISTS idx_social_posts_campaign_video_id
  ON social_posts(campaign_video_id);

\echo
\echo 'Verifying tables...'
SELECT relname FROM pg_class
WHERE relname IN ('email_campaign_videos', 'social_channel_credentials', 'social_posts')
ORDER BY relname;
