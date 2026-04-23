-- Commerce core phase 1: vendor integration registry

CREATE TABLE IF NOT EXISTS vendor_integration_registry (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('shopify', 'woocommerce', 'manual')),
  shop_domain TEXT,
  external_store_id TEXT,
  auth_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  connection_status TEXT NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'degraded', 'disconnected')),
  sync_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT
    CHECK (last_sync_status IN ('ok', 'warning', 'failed')),
  last_error TEXT,
  sla_target_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_name, source_type)
);

CREATE INDEX IF NOT EXISTS idx_vendor_integration_source
  ON vendor_integration_registry (source_type, is_active);

CREATE INDEX IF NOT EXISTS idx_vendor_integration_shop_domain
  ON vendor_integration_registry (shop_domain);
