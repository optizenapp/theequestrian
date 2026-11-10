-- Equestrian Rewards ledger (record-only until issuance is enabled).
-- Apply manually to Neon (same pattern as lib/db/schema/*.sql).
-- Movements are append-only; balances are derived by summing them per bucket.

CREATE TABLE IF NOT EXISTS rewards_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  estimate_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  issuance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  redemption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rate_bps INTEGER NOT NULL DEFAULT 200 CHECK (rate_bps BETWEEN 0 AND 10000),
  launch_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rewards_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS rewards_orders (
  order_id TEXT PRIMARY KEY,
  order_name TEXT,
  customer_id TEXT,
  currency TEXT NOT NULL,
  rate_bps INTEGER NOT NULL,
  calculation JSONB NOT NULL,
  original_award_cents INTEGER NOT NULL,
  current_award_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'released', 'void')),
  order_created_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_orders_customer ON rewards_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_rewards_orders_status ON rewards_orders (status);

CREATE TABLE IF NOT EXISTS rewards_movements (
  id BIGSERIAL PRIMARY KEY,
  operation_key TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES rewards_orders (order_id),
  customer_id TEXT,
  bucket TEXT NOT NULL CHECK (bucket IN ('pending', 'available')),
  type TEXT NOT NULL CHECK (type IN ('earn', 'adjust', 'release')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'posted', 'failed', 'ambiguous')),
  shopify_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_movements_order ON rewards_movements (order_id);
CREATE INDEX IF NOT EXISTS idx_rewards_movements_customer ON rewards_movements (customer_id);

-- Store credit actually written to Shopify. A customer's spendable target is the sum of their
-- 'available' movements; postings move Shopify towards it. At most one unresolved posting per
-- customer: an in-flight or ambiguous write blocks further writes until an admin resolves it.
CREATE TABLE IF NOT EXISTS rewards_credit_postings (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('credit', 'debit')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_flight', 'posted', 'failed', 'ambiguous')),
  shopify_transaction_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rewards_credit_postings_open
  ON rewards_credit_postings (customer_id) WHERE status IN ('in_flight', 'ambiguous');
CREATE INDEX IF NOT EXISTS idx_rewards_credit_postings_customer ON rewards_credit_postings (customer_id, status);
