"""Database migrations for enrichment pipeline tables.

Run: python -m src.db.migrations
"""

import asyncio
import structlog
from src.db.connection import get_conn, init_pool, close_pool

logger = structlog.get_logger()

MIGRATIONS = [
    # 1. Enrichment queue - tracks what needs processing and priority
    """
    CREATE TABLE IF NOT EXISTS enrichment_queue (
        id BIGSERIAL PRIMARY KEY,

        -- What are we enriching?
        page_type VARCHAR(20) NOT NULL CHECK (page_type IN ('product', 'collection')),
        page_identifier TEXT NOT NULL,  -- product_handle or url_path

        -- Priority scoring (higher = process first)
        priority_score FLOAT DEFAULT 0,
        priority_reasons JSONB DEFAULT '{}',

        -- Scheduling
        status VARCHAR(20) DEFAULT 'pending'
            CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
        scheduled_for TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        error_message TEXT,
        retry_count INT DEFAULT 0,

        -- Performance data snapshot at time of queuing
        gsc_data JSONB DEFAULT '{}',
        ga4_data JSONB DEFAULT '{}',

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(page_type, page_identifier, scheduled_for::date)
    );

    CREATE INDEX IF NOT EXISTS idx_eq_status_priority
        ON enrichment_queue(status, priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_eq_page
        ON enrichment_queue(page_type, page_identifier);
    CREATE INDEX IF NOT EXISTS idx_eq_scheduled
        ON enrichment_queue(scheduled_for);
    """,

    # 2. Enrichment log - full audit trail with before/after + rollback
    """
    CREATE TABLE IF NOT EXISTS enrichment_log (
        id BIGSERIAL PRIMARY KEY,
        queue_id BIGINT REFERENCES enrichment_queue(id),

        page_type VARCHAR(20) NOT NULL,
        page_identifier TEXT NOT NULL,

        -- Content snapshots for rollback
        before_content JSONB NOT NULL,
        after_content JSONB NOT NULL,

        -- What drove the changes
        gsc_snapshot JSONB DEFAULT '{}',
        ga4_snapshot JSONB DEFAULT '{}',
        serp_analysis JSONB DEFAULT '{}',

        -- Claude's reasoning
        enrichment_reasoning TEXT,
        model_used VARCHAR(50),
        prompt_tokens INT,
        completion_tokens INT,
        total_cost_usd FLOAT,

        -- Scoring
        before_scores JSONB DEFAULT '{}',
        after_scores JSONB DEFAULT '{}',

        -- Status
        applied BOOLEAN DEFAULT FALSE,
        rolled_back BOOLEAN DEFAULT FALSE,
        rolled_back_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_el_page
        ON enrichment_log(page_type, page_identifier);
    CREATE INDEX IF NOT EXISTS idx_el_created
        ON enrichment_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_el_applied
        ON enrichment_log(applied);
    """,

    # 3. SERP analysis cache - avoid re-crawling same queries
    """
    CREATE TABLE IF NOT EXISTS serp_cache (
        id BIGSERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        results JSONB NOT NULL,       -- Top 10 results with extracted content
        analysis JSONB DEFAULT '{}',  -- Claude's classification of each result
        crawled_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

        UNIQUE(query)
    );

    CREATE INDEX IF NOT EXISTS idx_serp_query ON serp_cache(query);
    CREATE INDEX IF NOT EXISTS idx_serp_expires ON serp_cache(expires_at);
    """,

    # 4. Performance metrics history - track GSC/GA4 over time per page
    """
    CREATE TABLE IF NOT EXISTS page_metrics_history (
        id BIGSERIAL PRIMARY KEY,
        page_type VARCHAR(20) NOT NULL,
        page_identifier TEXT NOT NULL,

        -- GSC aggregated metrics (30-day window)
        total_impressions INT DEFAULT 0,
        total_clicks INT DEFAULT 0,
        avg_position FLOAT,
        avg_ctr FLOAT,
        top_queries JSONB DEFAULT '[]',  -- [{query, impressions, clicks, position, ctr}]

        -- GA4 metrics
        sessions INT DEFAULT 0,
        revenue FLOAT DEFAULT 0,
        conversions INT DEFAULT 0,
        bounce_rate FLOAT,
        avg_session_duration FLOAT,

        -- Opportunity flags
        high_impression_low_position JSONB DEFAULT '[]',  -- Quick win queries
        high_impression_low_ctr JSONB DEFAULT '[]',       -- Title/desc optimization targets

        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(page_type, page_identifier, period_start, period_end)
    );

    CREATE INDEX IF NOT EXISTS idx_pmh_page
        ON page_metrics_history(page_type, page_identifier);
    CREATE INDEX IF NOT EXISTS idx_pmh_period
        ON page_metrics_history(period_start, period_end);
    """,

    # 5. Internal link graph - for Koray-style hub/spoke linking
    """
    CREATE TABLE IF NOT EXISTS internal_link_graph (
        id BIGSERIAL PRIMARY KEY,
        source_path TEXT NOT NULL,     -- URL path of the linking page
        target_path TEXT NOT NULL,     -- URL path of the linked page
        anchor_text TEXT,
        link_context TEXT,             -- Surrounding sentence/paragraph
        link_type VARCHAR(30) DEFAULT 'contextual'
            CHECK (link_type IN ('contextual', 'navigational', 'hub_spoke', 'related', 'breadcrumb')),
        is_suggested BOOLEAN DEFAULT FALSE,  -- TRUE if pipeline-suggested, not yet live
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(source_path, target_path)
    );

    CREATE INDEX IF NOT EXISTS idx_ilg_source ON internal_link_graph(source_path);
    CREATE INDEX IF NOT EXISTS idx_ilg_target ON internal_link_graph(target_path);
    """,
]


async def run_migrations():
    """Run all migrations."""
    async with get_conn() as conn:
        for i, migration in enumerate(MIGRATIONS):
            try:
                await conn.execute(migration)
                logger.info(f"Migration {i+1}/{len(MIGRATIONS)} applied successfully")
            except Exception as e:
                logger.error(f"Migration {i+1} failed", error=str(e))
                raise
    logger.info("All migrations completed")


if __name__ == "__main__":
    asyncio.run(run_migrations())
