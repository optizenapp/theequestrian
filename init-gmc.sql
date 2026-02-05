-- Google Merchant Center integration table
CREATE TABLE IF NOT EXISTS gmc_integration (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_gmc_integration_singleton ON gmc_integration(id);

COMMENT ON TABLE gmc_integration IS 'Stores GMC OAuth tokens and feed configuration (single row).';
