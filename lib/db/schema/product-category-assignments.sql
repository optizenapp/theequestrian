-- ============================================================================
-- PRODUCT CATEGORY ASSIGNMENTS
-- ============================================================================
-- Stores canonical category allocation per product for headless URLs
-- One canonical (deepest) category path per product
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_category_assignments (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE,               -- Shopify product GID
  product_handle TEXT NOT NULL UNIQUE,           -- Shopify product handle
  canonical_path TEXT NOT NULL UNIQUE,           -- e.g., "/horse/boots/bell-boots/product-handle"
  category_path TEXT NOT NULL,                   -- e.g., "/horse/boots/bell-boots"
  top_level TEXT NOT NULL,                       -- e.g., "horse"
  parent_category TEXT,                          -- e.g., "boots"
  subcategory_handle TEXT,                       -- e.g., "bell-boots"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pca_category_path ON product_category_assignments(category_path);
CREATE INDEX IF NOT EXISTS idx_pca_top_level ON product_category_assignments(top_level);
CREATE INDEX IF NOT EXISTS idx_pca_parent_category ON product_category_assignments(parent_category);
CREATE INDEX IF NOT EXISTS idx_pca_subcategory ON product_category_assignments(subcategory_handle);
CREATE INDEX IF NOT EXISTS idx_pca_product_handle ON product_category_assignments(product_handle);
