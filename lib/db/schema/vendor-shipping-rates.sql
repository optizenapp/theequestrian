-- Vendor Shipping Rates Schema
-- Stores shipping offset rates for each vendor

CREATE TABLE IF NOT EXISTS vendor_shipping_rates (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL UNIQUE,
  base_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tag_overrides JSONB DEFAULT '{}', -- {"#HEAVY": 15.00, "ponyjet": 15.00}
  weight_tiers JSONB DEFAULT '[]',  -- [{"min": 0, "max": 5, "rate": 8}, ...]
  -- When set, items priced at/above this (base price) get no shipping offset
  -- (free shipping absorbs the cost). NULL = always apply the offset.
  free_shipping_threshold NUMERIC(10, 2),
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE vendor_shipping_rates
  ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10, 2);

-- Tag-based shipping rates (global, not vendor-specific)
CREATE TABLE IF NOT EXISTS shipping_tag_rates (
  id SERIAL PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  rate NUMERIC(10, 2) NOT NULL,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_shipping_rates_vendor ON vendor_shipping_rates(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_shipping_rates_active ON vendor_shipping_rates(active);
CREATE INDEX IF NOT EXISTS idx_shipping_tag_rates_tag ON shipping_tag_rates(tag);
CREATE INDEX IF NOT EXISTS idx_shipping_tag_rates_active ON shipping_tag_rates(active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendor_shipping_rates_updated_at 
  BEFORE UPDATE ON vendor_shipping_rates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_tag_rates_updated_at 
  BEFORE UPDATE ON shipping_tag_rates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
