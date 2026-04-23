-- Canonical display brand (editable; distinct from Shopify vendor when needed).
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_products_brand_lower ON products (LOWER(TRIM(brand)));

-- Include brand in full-text search (weight C, same as vendor).
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.vendor, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
