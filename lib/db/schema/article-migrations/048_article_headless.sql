-- Headless blog commerce fields (Neon article table)
ALTER TABLE article ADD COLUMN IF NOT EXISTS headless_cta_path TEXT;
ALTER TABLE article ADD COLUMN IF NOT EXISTS headless_cta_label TEXT;
ALTER TABLE article ADD COLUMN IF NOT EXISTS headless_related_handles TEXT;

COMMENT ON COLUMN article.headless_cta_path IS 'Internal shop path for blog CTA e.g. /rider/helmets';
COMMENT ON COLUMN article.headless_cta_label IS 'Optional CTA button label';
COMMENT ON COLUMN article.headless_related_handles IS 'Comma-separated Shopify product handles for inline related products';
