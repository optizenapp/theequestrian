-- ============================================================================
-- PRODUCT CONTENT OVERRIDES
-- ============================================================================
-- Stores CMS overrides for product content and SEO fields
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_content_overrides (
  id SERIAL PRIMARY KEY,
  product_id TEXT,
  product_handle TEXT NOT NULL UNIQUE,
  title_override TEXT,
  meta_title TEXT,
  meta_description TEXT,
  description_html TEXT,
  bullet_points JSONB DEFAULT '[]'::jsonb,
  slug_override TEXT,
  top_description_html TEXT,
  bottom_description_html TEXT,
  use_headless_title BOOLEAN DEFAULT false,
  use_headless_meta_title BOOLEAN DEFAULT false,
  use_headless_meta_description BOOLEAN DEFAULT false,
  use_headless_description BOOLEAN DEFAULT false,
  use_headless_bullets BOOLEAN DEFAULT false,
  use_headless_slug BOOLEAN DEFAULT false,
  use_headless_top_description BOOLEAN DEFAULT false,
  use_headless_bottom_description BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pco_product_id ON product_content_overrides(product_id);
CREATE INDEX IF NOT EXISTS idx_pco_product_handle ON product_content_overrides(product_handle);
