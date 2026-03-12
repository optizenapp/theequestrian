-- Add Copiq social posts and PR contacts to article table
ALTER TABLE article ADD COLUMN IF NOT EXISTS copiq_social_posts JSONB;
ALTER TABLE article ADD COLUMN IF NOT EXISTS pr_contacts JSONB;

COMMENT ON COLUMN article.copiq_social_posts IS 'Social post drafts/status from Copiq';
COMMENT ON COLUMN article.pr_contacts IS 'PR contact emails and notification status';
