-- Commerce core phase 1: canonical catalog and source mapping

CREATE TABLE IF NOT EXISTS canonical_products (
  id BIGSERIAL PRIMARY KEY,
  canonical_slug TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'archived')),
  primary_category_path TEXT,
  source_priority TEXT NOT NULL DEFAULT 'vendor'
    CHECK (source_priority IN ('vendor', 'marketplace', 'manual_override')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_products_vendor
  ON canonical_products (vendor_name, status);

CREATE TABLE IF NOT EXISTS canonical_variants (
  id BIGSERIAL PRIMARY KEY,
  canonical_product_id BIGINT NOT NULL
    REFERENCES canonical_products (id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  option_label TEXT,
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  vendor_price_cents INTEGER NOT NULL CHECK (vendor_price_cents >= 0),
  sell_price_cents INTEGER NOT NULL CHECK (sell_price_cents >= 0),
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  inventory_state TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (inventory_state IN ('in_stock', 'low_stock', 'out_of_stock')),
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (canonical_product_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_canonical_variants_sku
  ON canonical_variants (sku);

CREATE TABLE IF NOT EXISTS source_variant_map (
  id BIGSERIAL PRIMARY KEY,
  integration_id INTEGER NOT NULL
    REFERENCES vendor_integration_registry (id) ON DELETE CASCADE,
  source_product_id TEXT NOT NULL,
  source_variant_id TEXT NOT NULL,
  canonical_variant_id BIGINT NOT NULL
    REFERENCES canonical_variants (id) ON DELETE CASCADE,
  mapping_confidence TEXT NOT NULL DEFAULT 'id_match'
    CHECK (mapping_confidence IN ('id_match', 'sku_match', 'manual_match')),
  map_status TEXT NOT NULL DEFAULT 'active'
    CHECK (map_status IN ('active', 'disabled', 'conflict')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (integration_id, source_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_source_variant_map_lookup
  ON source_variant_map (integration_id, source_product_id, map_status);
