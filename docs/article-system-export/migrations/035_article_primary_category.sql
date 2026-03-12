-- Add primary category support for hierarchical URLs
ALTER TABLE article ADD COLUMN IF NOT EXISTS primary_category_id UUID REFERENCES article_category(category_id);

-- Index for URL lookups
CREATE INDEX IF NOT EXISTS idx_article_primary_category ON article(primary_category_id);

