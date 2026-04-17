-- Neon Database Schema for The Equestrian
-- This schema stores product data for fast querying
-- Price and inventory are NOT stored - always fetched real-time from Shopify

-- Main products table
CREATE TABLE products (
  -- Core identifiers
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  
  -- Product information
  title TEXT NOT NULL,
  description TEXT,
  vendor TEXT,
  brand TEXT,
  brand_hub_handle TEXT,
  product_type TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Images (store first image URL for performance)
  image_url TEXT,
  image_alt TEXT,
  
  -- Availability (updated via webhooks, but price/inventory always real-time)
  available_for_sale BOOLEAN DEFAULT true,
  
  -- Shopify metadata
  shopify_created_at TIMESTAMP,
  
  -- Sync tracking
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Full-text search (optional, for future)
  search_vector tsvector
);

-- Indexes for fast filtering and searching
CREATE INDEX idx_handle ON products(handle);
CREATE INDEX idx_vendor ON products(vendor);
CREATE INDEX IF NOT EXISTS idx_products_brand_lower ON products (LOWER(TRIM(brand)));
CREATE INDEX idx_product_type ON products(product_type);
CREATE INDEX idx_tags ON products USING GIN(tags);
CREATE INDEX idx_available ON products(available_for_sale);
CREATE INDEX idx_created_at ON products(shopify_created_at DESC);

-- Full-text search index (optional, for future search feature)
CREATE INDEX idx_search ON products USING GIN(search_vector);

-- Function to update search vector automatically
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

-- Trigger to update search vector on insert/update
CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Facet cache table (optional optimization for popular filter combinations)
CREATE TABLE facet_cache (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  facets JSONB NOT NULL,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint on category + filters combination
  UNIQUE(category, filters)
);

CREATE INDEX idx_facet_category ON facet_cache(category);
CREATE INDEX idx_facet_filters ON facet_cache USING GIN(filters);
CREATE INDEX idx_facet_updated ON facet_cache(updated_at DESC);

-- Sync log table (track sync operations)
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'full', 'webhook', 'scheduled'
  products_synced INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_sync_started ON sync_log(started_at DESC);

-- Comments for documentation
COMMENT ON TABLE products IS 'Cached product data from Shopify. Price and inventory are NOT stored here - always fetched real-time.';
COMMENT ON COLUMN products.id IS 'Shopify product GID (e.g., gid://shopify/Product/123)';
COMMENT ON COLUMN products.handle IS 'URL-safe product handle';
COMMENT ON COLUMN products.tags IS 'Array of product tags (sizes, colors, categories)';
COMMENT ON COLUMN products.available_for_sale IS 'General availability flag (updated via webhooks). Real inventory checked via API.';
COMMENT ON TABLE facet_cache IS 'Pre-computed facets for popular filter combinations (optional optimization)';
COMMENT ON TABLE sync_log IS 'Tracks all sync operations for monitoring and debugging';

-- Variant projection tables for accurate size/color facets in Postgres
CREATE TABLE IF NOT EXISTS product_variants (
  variant_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_handle TEXT,
  title TEXT,
  available_for_sale BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pv_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_pv_product_handle ON product_variants(product_handle);

CREATE TABLE IF NOT EXISTS variant_options (
  id SERIAL PRIMARY KEY,
  variant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  option_name TEXT NOT NULL,
  option_name_normalized TEXT NOT NULL,
  option_value TEXT NOT NULL,
  option_value_normalized TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vo_variant_id ON variant_options(variant_id);
CREATE INDEX IF NOT EXISTS idx_vo_product_id ON variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_vo_name_value ON variant_options(option_name_normalized, option_value_normalized);
CREATE INDEX IF NOT EXISTS idx_vo_product_name ON variant_options(product_id, option_name_normalized);

-- Google Merchant Center integration (single-row config)
CREATE TABLE gmc_integration (
  id INTEGER PRIMARY KEY DEFAULT 1,
  merchant_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  scope TEXT,
  feed_id TEXT,
  feed_name TEXT,
  feed_fetch_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_gmc_integration_singleton ON gmc_integration(id);

COMMENT ON TABLE gmc_integration IS 'Stores GMC OAuth tokens and feed configuration (single row).';
