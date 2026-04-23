-- Commerce core phase 1: checkout, order ledger, vendor routing

CREATE TABLE IF NOT EXISTS commerce_orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents INTEGER NOT NULL CHECK (shipping_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending_routing'
    CHECK (order_status IN ('pending_routing', 'partially_routed', 'routed', 'fulfilled', 'cancelled')),
  stripe_payment_intent_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commerce_orders_status
  ON commerce_orders (payment_status, order_status, placed_at DESC);

CREATE TABLE IF NOT EXISTS commerce_order_lines (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES commerce_orders (id) ON DELETE CASCADE,
  canonical_variant_id BIGINT NOT NULL REFERENCES canonical_variants (id),
  integration_id INTEGER NOT NULL REFERENCES vendor_integration_registry (id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  shipping_allocation_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_allocation_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commerce_order_lines_order
  ON commerce_order_lines (order_id, integration_id);

CREATE TABLE IF NOT EXISTS vendor_child_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES commerce_orders (id) ON DELETE CASCADE,
  integration_id INTEGER NOT NULL REFERENCES vendor_integration_registry (id),
  external_order_id TEXT,
  route_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (route_status IN ('queued', 'sent', 'acknowledged', 'retrying', 'failed')),
  route_attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_child_orders_retry
  ON vendor_child_orders (route_status, next_retry_at);
