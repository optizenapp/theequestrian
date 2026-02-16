-- ============================================================================
-- SEO ENRICHMENT PIPELINE TABLES
-- ============================================================================
-- Queue, audit, metrics history, SERP cache, and internal link suggestions.
-- Designed to integrate with existing:
--   - product_content_overrides
--   - collection_content
--   - product_category_assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS enrichment_queue (
  id BIGSERIAL PRIMARY KEY,
  page_type TEXT NOT NULL CHECK (page_type IN ('product', 'collection')),
  page_identifier TEXT NOT NULL,                         -- product handle or collection path
  canonical_path TEXT NOT NULL,                         -- actual ranking URL path

  priority_score DOUBLE PRECISION DEFAULT 0,
  priority_reasons JSONB DEFAULT '{}'::jsonb,

  gsc_data JSONB DEFAULT '{}'::jsonb,
  ga4_data JSONB DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for_day DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status_priority
  ON enrichment_queue(status, priority_score DESC, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_page
  ON enrichment_queue(page_type, page_identifier);
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_canonical_path
  ON enrichment_queue(canonical_path);
CREATE UNIQUE INDEX IF NOT EXISTS ux_enrichment_queue_page_day
  ON enrichment_queue(page_type, page_identifier, scheduled_for_day);

ALTER TABLE enrichment_queue
  ADD COLUMN IF NOT EXISTS scheduled_for_day DATE NOT NULL DEFAULT CURRENT_DATE;


CREATE TABLE IF NOT EXISTS enrichment_log (
  id BIGSERIAL PRIMARY KEY,
  queue_id BIGINT REFERENCES enrichment_queue(id) ON DELETE SET NULL,

  page_type TEXT NOT NULL CHECK (page_type IN ('product', 'collection')),
  page_identifier TEXT NOT NULL,
  canonical_path TEXT NOT NULL,

  before_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_content JSONB NOT NULL DEFAULT '{}'::jsonb,

  gsc_snapshot JSONB DEFAULT '{}'::jsonb,
  ga4_snapshot JSONB DEFAULT '{}'::jsonb,
  serp_analysis JSONB DEFAULT '{}'::jsonb,

  enrichment_reasoning TEXT,
  model_used TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_cost_usd DOUBLE PRECISION,
  koray_framework_version TEXT,
  koray_rule_ids_used JSONB DEFAULT '[]'::jsonb,

  before_scores JSONB DEFAULT '{}'::jsonb,
  after_scores JSONB DEFAULT '{}'::jsonb,

  applied BOOLEAN NOT NULL DEFAULT FALSE,
  rolled_back BOOLEAN NOT NULL DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_log_page
  ON enrichment_log(page_type, page_identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_applied
  ON enrichment_log(applied, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_koray_version
  ON enrichment_log(koray_framework_version, created_at DESC);

ALTER TABLE enrichment_log
  ADD COLUMN IF NOT EXISTS koray_framework_version TEXT;
ALTER TABLE enrichment_log
  ADD COLUMN IF NOT EXISTS koray_rule_ids_used JSONB DEFAULT '[]'::jsonb;


CREATE TABLE IF NOT EXISTS serp_cache (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL UNIQUE,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_serp_cache_expires_at ON serp_cache(expires_at);


CREATE TABLE IF NOT EXISTS page_metrics_history (
  id BIGSERIAL PRIMARY KEY,
  page_type TEXT NOT NULL CHECK (page_type IN ('product', 'collection')),
  page_identifier TEXT NOT NULL,
  canonical_path TEXT NOT NULL,

  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  avg_position DOUBLE PRECISION,
  avg_ctr DOUBLE PRECISION,
  top_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
  high_impression_low_position JSONB NOT NULL DEFAULT '[]'::jsonb,
  high_impression_low_ctr JSONB NOT NULL DEFAULT '[]'::jsonb,

  sessions INTEGER NOT NULL DEFAULT 0,
  revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  bounce_rate DOUBLE PRECISION,
  avg_session_duration DOUBLE PRECISION,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  transactions INTEGER NOT NULL DEFAULT 0,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(page_type, page_identifier, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_page_metrics_history_page
  ON page_metrics_history(page_type, page_identifier, period_end DESC);


CREATE TABLE IF NOT EXISTS internal_link_graph (
  id BIGSERIAL PRIMARY KEY,
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  anchor_text TEXT,
  link_context TEXT,
  link_type TEXT NOT NULL DEFAULT 'contextual'
    CHECK (link_type IN ('contextual', 'navigational', 'hub_spoke', 'related', 'breadcrumb')),
  is_suggested BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_path, target_path)
);

CREATE INDEX IF NOT EXISTS idx_internal_link_graph_source ON internal_link_graph(source_path);
CREATE INDEX IF NOT EXISTS idx_internal_link_graph_target ON internal_link_graph(target_path);


CREATE OR REPLACE FUNCTION update_enrichment_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.scheduled_for_day = (NEW.scheduled_for AT TIME ZONE 'UTC')::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_enrichment_queue_updated_at ON enrichment_queue;
CREATE TRIGGER trig_enrichment_queue_updated_at
  BEFORE INSERT OR UPDATE ON enrichment_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_queue_updated_at();


CREATE OR REPLACE FUNCTION update_internal_link_graph_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_internal_link_graph_updated_at ON internal_link_graph;
CREATE TRIGGER trig_internal_link_graph_updated_at
  BEFORE UPDATE ON internal_link_graph
  FOR EACH ROW
  EXECUTE FUNCTION update_internal_link_graph_updated_at();

