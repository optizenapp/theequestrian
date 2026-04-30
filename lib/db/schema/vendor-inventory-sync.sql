-- Vendor direct sync: webhooks from each vendor Shopify → marketplace Shopify.
-- Apply manually to Neon (same pattern as lib/db/schema/*.sql).

CREATE TABLE IF NOT EXISTS vendor_shop_connections (
  id SERIAL PRIMARY KEY,
  shop_domain TEXT NOT NULL UNIQUE,
  marketplace_vendor_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  inventory_strategy TEXT NOT NULL DEFAULT 'single_location'
    CHECK (inventory_strategy IN ('single_location', 'summed_locations')),
  primary_location_id TEXT,
  allowed_location_ids JSONB DEFAULT '[]'::jsonb,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_price BOOLEAN NOT NULL DEFAULT false,
  reconcile_enabled BOOLEAN NOT NULL DEFAULT false,
  reconcile_cooldown_seconds INTEGER NOT NULL DEFAULT 20,
  last_reconcile_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_shop_connections
  ADD COLUMN IF NOT EXISTS sync_inventory BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vendor_shop_connections
  ADD COLUMN IF NOT EXISTS reconcile_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vendor_shop_connections
  ADD COLUMN IF NOT EXISTS reconcile_cooldown_seconds INTEGER NOT NULL DEFAULT 20;
ALTER TABLE vendor_shop_connections
  ADD COLUMN IF NOT EXISTS last_reconcile_at TIMESTAMPTZ;
ALTER TABLE vendor_shop_connections
  ADD COLUMN IF NOT EXISTS sync_status BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendor_shop_connections_active
  ON vendor_shop_connections (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vendor_shop_connections_vendor
  ON vendor_shop_connections (marketplace_vendor_name);

CREATE TABLE IF NOT EXISTS vendor_inventory_map (
  id SERIAL PRIMARY KEY,
  vendor_connection_id INTEGER NOT NULL REFERENCES vendor_shop_connections (id) ON DELETE CASCADE,
  vendor_shopify_product_id TEXT NOT NULL,
  vendor_shopify_variant_id TEXT NOT NULL,
  vendor_inventory_item_id TEXT NOT NULL,
  vendor_location_id TEXT,
  marketplace_product_id TEXT NOT NULL,
  marketplace_variant_id TEXT NOT NULL,
  marketplace_inventory_item_id TEXT NOT NULL,
  marketplace_location_id TEXT NOT NULL,
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_inventory_map_unique_row
  ON vendor_inventory_map (vendor_connection_id, vendor_inventory_item_id, COALESCE(vendor_location_id, ''));

CREATE INDEX IF NOT EXISTS idx_vendor_inventory_map_item
  ON vendor_inventory_map (vendor_connection_id, vendor_inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_map_mkt_variant
  ON vendor_inventory_map (marketplace_variant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_map_status
  ON vendor_inventory_map (status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS vendor_inventory_state (
  id SERIAL PRIMARY KEY,
  vendor_connection_id INTEGER NOT NULL REFERENCES vendor_shop_connections (id) ON DELETE CASCADE,
  vendor_shop_domain TEXT NOT NULL,
  vendor_inventory_item_id TEXT NOT NULL,
  vendor_location_id TEXT NOT NULL,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  last_source_check_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_connection_id, vendor_inventory_item_id, vendor_location_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_inventory_state_connection
  ON vendor_inventory_state (vendor_connection_id);

-- Per-vendor product status snapshot. Source of truth for whether a vendor
-- product is currently active/draft/archived/deleted. Used by:
--   1. The vendor → marketplace push (sets marketplace status when vendor flips)
--   2. The marketplace reconcile webhook (reverts Webkul if it tries to
--      re-activate a marketplace product whose vendor source is non-active)
CREATE TABLE IF NOT EXISTS vendor_product_status (
  id SERIAL PRIMARY KEY,
  vendor_connection_id INTEGER NOT NULL REFERENCES vendor_shop_connections (id) ON DELETE CASCADE,
  vendor_shopify_product_id TEXT NOT NULL,
  marketplace_product_id TEXT,
  vendor_status TEXT NOT NULL CHECK (vendor_status IN ('active', 'draft', 'archived', 'deleted')),
  last_webhook_topic TEXT,
  last_webhook_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_connection_id, vendor_shopify_product_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_product_status_marketplace
  ON vendor_product_status (marketplace_product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_product_status_non_active
  ON vendor_product_status (vendor_connection_id, vendor_status)
  WHERE vendor_status <> 'active';
