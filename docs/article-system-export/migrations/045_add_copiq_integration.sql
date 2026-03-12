-- Migration 045: Add Copiq Integration
-- Description: Adds copiq_id field to article table for external article management
-- Date: 2026-01-13

-- Add copiq_id field to article table
ALTER TABLE article ADD COLUMN IF NOT EXISTS copiq_id VARCHAR(255) UNIQUE;

-- Add index for fast lookups by copiq_id
CREATE INDEX IF NOT EXISTS idx_article_copiq_id ON article(copiq_id);

-- Add comment
COMMENT ON COLUMN article.copiq_id IS 'Unique identifier from Copiq for upsert operations and external article management';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 045 complete: Copiq integration field added to article table';
END $$;
