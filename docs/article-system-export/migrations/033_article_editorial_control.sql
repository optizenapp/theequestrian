-- Add editorial control flag to articles
-- This allows excluding sensitive or non-visitor content from place-specific hubs
ALTER TABLE article ADD COLUMN IF NOT EXISTS exclude_from_place_hubs BOOLEAN DEFAULT false;

-- Add an index for performance when filtering
CREATE INDEX IF NOT EXISTS idx_article_exclude_place_hubs ON article(exclude_from_place_hubs) WHERE exclude_from_place_hubs = true;

