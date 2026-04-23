-- Commerce core phase 1: commissions, payouts, event receipts, sync jobs

CREATE TABLE IF NOT EXISTS commission_rules_category (
  id SERIAL PRIMARY KEY,
  category_path TEXT NOT NULL,
  commission_bps INTEGER NOT NULL CHECK (commission_bps >= 0 AND commission_bps <= 10000),
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_lookup
  ON commission_rules_category (category_path, is_active, effective_from DESC);

CREATE TABLE IF NOT EXISTS commission_ledger (
  id BIGSERIAL PRIMARY KEY,
  order_line_id BIGINT NOT NULL REFERENCES commerce_order_lines (id) ON DELETE CASCADE,
  gross_cents INTEGER NOT NULL CHECK (gross_cents >= 0),
  commission_cents INTEGER NOT NULL CHECK (commission_cents >= 0),
  net_vendor_cents INTEGER NOT NULL CHECK (net_vendor_cents >= 0),
  rule_id INTEGER REFERENCES commission_rules_category (id),
  ledger_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ledger_status IN ('pending', 'approved', 'paid', 'reversed')),
  month_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_month
  ON commission_ledger (month_key, ledger_status);

CREATE TABLE IF NOT EXISTS payout_batches (
  id BIGSERIAL PRIMARY KEY,
  month_key TEXT NOT NULL,
  batch_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (batch_status IN ('draft', 'approved', 'paid', 'cancelled')),
  total_vendor_cents INTEGER NOT NULL DEFAULT 0,
  total_commission_cents INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (month_key, batch_status)
);

CREATE TABLE IF NOT EXISTS payout_batch_lines (
  id BIGSERIAL PRIMARY KEY,
  payout_batch_id BIGINT NOT NULL REFERENCES payout_batches (id) ON DELETE CASCADE,
  commission_ledger_id BIGINT NOT NULL REFERENCES commission_ledger (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payout_batch_id, commission_ledger_id)
);

CREATE TABLE IF NOT EXISTS event_receipts (
  id BIGSERIAL PRIMARY KEY,
  source_system TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  receipt_status TEXT NOT NULL DEFAULT 'received'
    CHECK (receipt_status IN ('received', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  integration_id INTEGER REFERENCES vendor_integration_registry (id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'retry', 'failed', 'done')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_pickup
  ON sync_jobs (status, next_retry_at, created_at);
