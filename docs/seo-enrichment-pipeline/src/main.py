"""Main entry point for the SEO Enrichment Pipeline.

Runs as an always-on service on EC2:
- Daily at 2 AM: Select and enqueue ~300 pages
- Continuously: Process queue items (with concurrency limits)
- Handles graceful shutdown, retries, logging
"""

import asyncio
import signal
import sys
import json
from datetime import datetime
import structlog

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.config.settings import settings
from src.utils.logger import setup_logging
from src.db.connection import init_pool, close_pool
from src.db.queries import QueueQueries
from src.db.connection import get_cursor, get_conn
from src.modules.data_collector import DataCollector
from src.modules.page_selector import PageSelector
from src.modules.serp_analyzer import SerpAnalyzer
from src.modules.enrichment_engine import EnrichmentEngine
from src.modules.db_writer import DBWriter

setup_logging()
logger = structlog.get_logger()


class Pipeline:
    """Main pipeline orchestrator."""

    def __init__(self):
        self.data_collector = DataCollector()
        self.page_selector = PageSelector(self.data_collector)
        self.serp_analyzer = SerpAnalyzer()
        self.enrichment_engine = EnrichmentEngine()
        self.db_writer = DBWriter()
        self._shutdown = False
        self._active_tasks: set[asyncio.Task] = set()

    async def run_daily_selection(self):
        """Daily job: select pages and enqueue them."""
        logger.info("=" * 60)
        logger.info("DAILY SELECTION STARTING", timestamp=datetime.now().isoformat())
        logger.info("=" * 60)

        try:
            batch = await self.page_selector.select_daily_batch()
            logger.info(f"Daily selection complete: {len(batch)} pages enqueued")

            # Also requeue any failed items from previous runs
            async with get_cursor() as cur:
                await cur.execute(QueueQueries.REQUEUE_FAILED)
                logger.info("Failed items requeued for retry")

        except Exception as e:
            logger.error("Daily selection failed", error=str(e))

    async def process_queue(self):
        """Continuously process the enrichment queue."""
        logger.info("Queue processor started")

        while not self._shutdown:
            try:
                # Claim a batch from the queue
                async with get_conn() as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(QueueQueries.CLAIM_NEXT_BATCH, {
                            "batch_size": settings.max_concurrent_claude_calls,
                        })
                        items = await cur.fetchall()

                if not items:
                    await asyncio.sleep(30)
                    continue

                logger.info(f"Claimed {len(items)} items from queue")

                # Process items concurrently (within limits)
                tasks = []
                for item in items:
                    task = asyncio.create_task(self._process_single_item(dict(item)))
                    self._active_tasks.add(task)
                    task.add_done_callback(self._active_tasks.discard)
                    tasks.append(task)

                await asyncio.gather(*tasks, return_exceptions=True)

            except Exception as e:
                logger.error("Queue processor error", error=str(e))
                await asyncio.sleep(60)

    async def _process_single_item(self, queue_item: dict):
        """Process a single page through the full pipeline."""
        page_type = queue_item["page_type"]
        page_id = queue_item["page_identifier"]

        logger.info("Processing page", page_type=page_type, page_id=page_id,
                     priority=queue_item["priority_score"])

        try:
            # 1. Get top queries for SERP analysis
            page_path = f"/products/{page_id}" if page_type == "product" else page_id
            gsc_data = json.loads(queue_item["gsc_data"]) if isinstance(queue_item["gsc_data"], str) else queue_item["gsc_data"]

            top_queries = [q["query"] for q in gsc_data.get("top_queries", [])[:settings.serp_top_n_queries]]
            quick_wins = [q["query"] for q in gsc_data.get("high_impression_low_position", [])[:3]]
            all_queries = list(dict.fromkeys(top_queries + quick_wins))[:settings.serp_top_n_queries]

            # 2. Analyze SERPs
            serp_analysis = {}
            if all_queries:
                serp_analysis = await self.serp_analyzer.analyze_queries(all_queries)
            else:
                logger.info("No queries to analyze (new page?)", page_id=page_id)

            # 3. Generate enriched content
            enriched = await self.enrichment_engine.enrich_page(queue_item, serp_analysis)

            if not enriched:
                await self._mark_failed(queue_item["id"], "Enrichment returned None")
                return

            enriched["_serp_analysis"] = serp_analysis

            # 4. Write to DB + trigger ISR
            log_id = await self.db_writer.write_enrichment(queue_item, enriched)

            # 5. Mark completed
            await self._mark_completed(queue_item["id"])

            usage = enriched.get("_usage", {})
            logger.info("Page enrichment complete",
                        page_type=page_type, page_id=page_id,
                        log_id=log_id, cost_usd=usage.get("cost_usd", 0))

        except Exception as e:
            logger.error("Page processing failed",
                         page_type=page_type, page_id=page_id, error=str(e))
            await self._mark_failed(queue_item["id"], str(e))

    async def _mark_completed(self, queue_id: int):
        async with get_cursor() as cur:
            await cur.execute(QueueQueries.MARK_COMPLETED, {"id": queue_id})

    async def _mark_failed(self, queue_id: int, error: str):
        async with get_cursor() as cur:
            await cur.execute(QueueQueries.MARK_FAILED, {"id": queue_id, "error": error[:500]})

    async def shutdown(self):
        """Graceful shutdown."""
        logger.info("Shutdown initiated...")
        self._shutdown = True

        if self._active_tasks:
            logger.info(f"Waiting for {len(self._active_tasks)} active tasks...")
            await asyncio.gather(*self._active_tasks, return_exceptions=True)

        await self.serp_analyzer.close()
        await close_pool()
        logger.info("Shutdown complete")


async def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("SEO ENRICHMENT PIPELINE STARTING")
    logger.info(f"Batch size: {settings.daily_batch_size}")
    logger.info(f"Enrichment interval: {settings.enrichment_interval_days} days")
    logger.info(f"Model: {settings.claude_model}")
    logger.info("=" * 60)

    await init_pool()
    pipeline = Pipeline()

    # Signal handlers for graceful shutdown
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(pipeline.shutdown()))

    # Scheduler for daily selection
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        pipeline.run_daily_selection,
        CronTrigger(hour=2, minute=0),
        id="daily_selection",
        name="Daily page selection",
    )
    scheduler.start()
    logger.info("Scheduler started (daily selection at 2:00 AM)")

    # Run initial selection if queue is empty
    async with get_cursor() as cur:
        await cur.execute("SELECT COUNT(*) as cnt FROM enrichment_queue WHERE status = 'pending'")
        row = await cur.fetchone()
        if row and row["cnt"] == 0:
            logger.info("Queue empty — running initial selection")
            await pipeline.run_daily_selection()

    # Start processing
    try:
        await pipeline.process_queue()
    except asyncio.CancelledError:
        pass
    finally:
        scheduler.shutdown()
        await pipeline.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
