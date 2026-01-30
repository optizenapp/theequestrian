CREATE TABLE IF NOT EXISTS price_offset_audit (
  variant_id TEXT PRIMARY KEY,
  product_id TEXT,
  vendor_name TEXT,
  tags JSONB,
  vendor_price NUMERIC(12,2),
  vendor_compare_at NUMERIC(12,2),
  shipping_offset NUMERIC(12,2),
  adjusted_price NUMERIC(12,2),
  adjusted_compare_at NUMERIC(12,2),
  tag_match TEXT,
  last_source TEXT,
  last_event_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_offset_audit_vendor_idx
  ON price_offset_audit (vendor_name);

CREATE INDEX IF NOT EXISTS price_offset_audit_product_idx
  ON price_offset_audit (product_id);
