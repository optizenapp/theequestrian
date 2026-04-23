-- Manual marketplace price overrides.
-- Variants in this table are locked: vendor-sync webhooks and the
-- shopify-price-offset bulk job MUST NOT overwrite their price.
-- Apply manually to Neon (same pattern as lib/db/schema/*.sql).

CREATE TABLE IF NOT EXISTS marketplace_price_locks (
  variant_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_handle TEXT,
  locked_price NUMERIC(10, 2) NOT NULL,
  locked_compare_at NUMERIC(10, 2),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_price_locks_product
  ON marketplace_price_locks (product_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_price_locks_handle
  ON marketplace_price_locks (product_handle);
