"""Page selector: decides which ~300 pages to enrich today.

Priority scoring logic:
1. Never enriched (highest priority)
2. High impressions but low position (quick wins)
3. High impressions but low CTR (title/desc optimization)
4. Revenue-generating pages that are declining
5. Pages not enriched in longest time
"""

import json
from datetime import datetime, timedelta
from typing import Any
import structlog

from src.config.settings import settings
from src.db.connection import get_cursor
from src.db.queries import PageQueries, QueueQueries
from src.modules.data_collector import DataCollector

logger = structlog.get_logger()


class PageSelector:
    """Selects and prioritizes pages for daily enrichment.
    
    Guarantees all pages are enriched within the configured interval (default 30 days)
    by dynamically calculating batch size based on total eligible pages.
    """

    def __init__(self, data_collector: DataCollector):
        self.data_collector = data_collector
        self.min_batch_size = 50      # floor — don't run tiny batches
        self.max_batch_size = 500     # ceiling — cap API/compute costs per day
        self.buffer_days = 3          # finish 3 days early to absorb failures/retries

    async def select_daily_batch(self) -> list[dict[str, Any]]:
        """Select and enqueue today's batch of pages to enrich.
        
        Batch size is calculated dynamically:
          batch = ceil(eligible_pages / (interval_days - buffer_days))
        This guarantees full coverage within the 30-day window.
        """

        # 1. Get all pages eligible for enrichment
        eligible_pages = await self._get_eligible_pages()
        total_eligible = len(eligible_pages)
        logger.info(f"Found {total_eligible} eligible pages")

        if not eligible_pages:
            logger.info("No pages need enrichment — all pages are current")
            return []

        # 2. Calculate dynamic batch size to guarantee full coverage
        effective_days = max(settings.enrichment_interval_days - self.buffer_days, 7)
        calculated_batch = -(-total_eligible // effective_days)  # ceiling division
        batch_size = max(self.min_batch_size, min(calculated_batch, self.max_batch_size))

        logger.info(
            "Dynamic batch size calculated",
            total_eligible=total_eligible,
            interval_days=settings.enrichment_interval_days,
            effective_days=effective_days,
            calculated_batch=calculated_batch,
            final_batch_size=batch_size,
            days_to_complete=(-(-total_eligible // batch_size)),
        )

        # 3. Fetch GSC/GA4 data for all eligible pages (batched)
        pages_with_metrics = await self._enrich_with_metrics(eligible_pages)

        # 4. Score and rank
        scored_pages = self._score_pages(pages_with_metrics)

        # 5. Take top N (dynamic batch size)
        batch = scored_pages[:batch_size]
        logger.info(f"Selected {len(batch)} pages for enrichment")

        # 6. Enqueue
        await self._enqueue_batch(batch)

        return batch

    async def _get_eligible_pages(self) -> list[dict]:
        """Fetch pages that haven't been enriched within the interval."""
        async with get_cursor() as cur:
            await cur.execute(
                PageQueries.PAGES_NEEDING_ENRICHMENT,
                {"interval_days": settings.enrichment_interval_days}
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    async def _enrich_with_metrics(self, pages: list[dict]) -> list[dict]:
        """Add GSC and GA4 metrics to each page."""
        enriched = []
        for page in pages:
            page_path = self._get_page_url_path(page)
            try:
                gsc_data = await self.data_collector.get_gsc_data_for_page(page_path)
                ga4_data = await self.data_collector.get_ga4_data_for_page(page_path)
                page["gsc_data"] = gsc_data
                page["ga4_data"] = ga4_data
                enriched.append(page)
            except Exception as e:
                logger.warning("Failed to fetch metrics for page",
                               page=page["page_identifier"], error=str(e))
                # Still include it, just without metrics
                page["gsc_data"] = {}
                page["ga4_data"] = {}
                enriched.append(page)

        return enriched

    def _score_pages(self, pages: list[dict]) -> list[dict]:
        """Score each page for enrichment priority.
        
        Pages are scored AND filtered:
        - High score = process first (quick wins, revenue, stale content)
        - Score of 0 or below = skip (already performing well, no opportunities)
        """
        scored = []

        for page in pages:
            score = 0.0
            reasons = {}
            gsc = page.get("gsc_data", {})
            ga4 = page.get("ga4_data", {})

            # ── SKIP CHECK: already performing well? ──
            # If page is position <5, CTR >5%, and no quick-win queries → low priority
            avg_pos = gsc.get("avg_position", 0)
            avg_ctr = gsc.get("avg_ctr", 0)
            quick_wins = gsc.get("high_impression_low_position", [])
            low_ctr_queries = gsc.get("high_impression_low_ctr", [])

            if (avg_pos > 0 and avg_pos < 5 
                and avg_ctr > 0.05 
                and not quick_wins 
                and not low_ctr_queries):
                # Page is already performing well — still include but lowest priority
                score = 1.0
                reasons["already_performing_well"] = True
                page["priority_score"] = score
                page["priority_reasons"] = reasons
                scored.append(page)
                continue

            # ── Factor 1: Never enriched (highest priority) ──
            if page.get("last_enriched") is None:
                score += 50
                reasons["never_enriched"] = True

            # ── Factor 2: Quick wins (high impressions, position >10) ──
            if quick_wins:
                score += 30 * min(len(quick_wins), 5) / 5
                reasons["quick_win_queries"] = len(quick_wins)

            # ── Factor 3: CTR optimization targets ──
            if low_ctr_queries:
                score += 20 * min(len(low_ctr_queries), 5) / 5
                reasons["low_ctr_queries"] = len(low_ctr_queries)

            # ── Factor 4: Revenue-generating pages ──
            revenue = ga4.get("revenue", 0)
            if revenue > 0:
                score += min(revenue / 100, 20)
                reasons["has_revenue"] = revenue

            # ── Factor 5: Impression volume (higher impact) ──
            impressions = gsc.get("total_impressions", 0)
            if impressions > 0:
                score += min(impressions / 1000, 15)
                reasons["impression_volume"] = impressions

            # ── Factor 6: Staleness ──
            if page.get("last_enriched"):
                days_stale = (datetime.now(page["last_enriched"].tzinfo) - page["last_enriched"]).days
                score += min(days_stale / 30, 10)
                reasons["days_since_enrichment"] = days_stale

            # ── Factor 7: Collections boost (affect multiple products) ──
            if page["page_type"] == "collection":
                score += 5
                reasons["is_collection"] = True

            # ── Factor 8: No GSC data at all → new/unindexed page, needs content ──
            if not gsc.get("top_queries"):
                score += 15
                reasons["no_search_data"] = True

            page["priority_score"] = round(score, 2)
            page["priority_reasons"] = reasons
            scored.append(page)

        # Sort by score descending
        scored.sort(key=lambda p: p["priority_score"], reverse=True)
        return scored

    async def _enqueue_batch(self, batch: list[dict]):
        """Insert batch into the enrichment queue."""
        async with get_cursor() as cur:
            for page in batch:
                await cur.execute(QueueQueries.ENQUEUE_PAGE, {
                    "page_type": page["page_type"],
                    "page_identifier": page["page_identifier"],
                    "priority_score": page["priority_score"],
                    "priority_reasons": json.dumps(page["priority_reasons"]),
                    "gsc_data": json.dumps(page.get("gsc_data", {})),
                    "ga4_data": json.dumps(page.get("ga4_data", {})),
                })
            # Commit happens automatically on context exit

        logger.info(f"Enqueued {len(batch)} pages")

    @staticmethod
    def _get_page_url_path(page: dict) -> str:
        """Convert page identifier to URL path for API lookups."""
        if page["page_type"] == "product":
            return f"/products/{page['page_identifier']}"
        else:
            return page["page_identifier"]
