"""DB Writer: writes enriched content to Postgres and triggers ISR revalidation.

Handles:
- Upserting product_content_overrides
- Updating collection_content
- Recording internal link suggestions
- Logging everything for audit/rollback
- Triggering Next.js ISR revalidation
"""

import json
from typing import Any
import structlog
import httpx

from src.config.settings import settings
from src.db.connection import get_conn, get_cursor
from src.db.queries import WriteQueries, EnrichmentLogQueries

logger = structlog.get_logger()


class DBWriter:
    """Writes enriched content to the database and triggers revalidation."""

    async def write_enrichment(self, queue_item: dict, enriched: dict) -> int | None:
        """Write enriched content to DB.

        Args:
            queue_item: Original queue row
            enriched: Claude's enrichment output with _before_content, _page_type, etc.

        Returns:
            enrichment_log ID, or None if failed
        """
        page_type = enriched["_page_type"]
        page_id = enriched["_page_identifier"]
        before_content = enriched["_before_content"]
        usage = enriched.get("_usage", {})

        logger.info("Writing enrichment", page_type=page_type, page_id=page_id)

        try:
            async with get_conn() as conn:
                async with conn.cursor() as cur:
                    # 1. Write the content
                    if page_type == "product":
                        await self._write_product(cur, page_id, enriched)
                    elif page_type == "collection":
                        await self._write_collection(cur, page_id, enriched)

                    # 2. Write internal link suggestions
                    link_suggestions = enriched.get("internal_link_suggestions", [])
                    await self._write_link_suggestions(cur, page_id, link_suggestions)

                    # 3. Log the enrichment
                    after_content = self._extract_after_content(page_type, enriched)

                    await cur.execute(EnrichmentLogQueries.INSERT_LOG, {
                        "queue_id": queue_item["id"],
                        "page_type": page_type,
                        "page_identifier": page_id,
                        "before_content": json.dumps(before_content, default=str),
                        "after_content": json.dumps(after_content, default=str),
                        "gsc_snapshot": queue_item.get("gsc_data", "{}"),
                        "ga4_snapshot": queue_item.get("ga4_data", "{}"),
                        "serp_analysis": json.dumps(enriched.get("_serp_analysis", {}), default=str),
                        "enrichment_reasoning": enriched.get("reasoning", ""),
                        "model_used": usage.get("model", settings.claude_model),
                        "prompt_tokens": usage.get("input_tokens", 0),
                        "completion_tokens": usage.get("output_tokens", 0),
                        "total_cost_usd": usage.get("cost_usd", 0),
                        "before_scores": json.dumps({}),
                        "after_scores": json.dumps({}),
                        "applied": True,
                    })
                    log_row = await cur.fetchone()
                    log_id = log_row["id"] if log_row else None

                # Connection auto-commits on exit

            logger.info("Enrichment written successfully",
                        page_type=page_type, page_id=page_id, log_id=log_id)

            # 4. Trigger ISR revalidation
            await self._trigger_revalidation(page_type, page_id)

            return log_id

        except Exception as e:
            logger.error("Failed to write enrichment",
                         page_type=page_type, page_id=page_id, error=str(e))
            raise

    async def _write_product(self, cur, handle: str, enriched: dict):
        """Upsert product_content_overrides."""
        bullet_points = enriched.get("bullet_points", [])
        if isinstance(bullet_points, list):
            bullet_points = json.dumps(bullet_points)

        await cur.execute(WriteQueries.UPSERT_PRODUCT_OVERRIDE, {
            "product_handle": handle,
            "meta_title": enriched.get("meta_title", ""),
            "meta_description": enriched.get("meta_description", ""),
            "title_override": enriched.get("title_override", ""),
            "description_html": enriched.get("description_html", ""),
            "top_description_html": enriched.get("top_description_html", ""),
            "bottom_description_html": enriched.get("bottom_description_html", ""),
            "bullet_points": bullet_points,
        })

    async def _write_collection(self, cur, url_path: str, enriched: dict):
        """Update collection_content."""
        faq_items = enriched.get("faq_items", [])
        related_categories = enriched.get("related_categories", [])

        await cur.execute(WriteQueries.UPDATE_COLLECTION_CONTENT, {
            "url_path": url_path,
            "h1_title": enriched.get("h1_title", ""),
            "meta_title": enriched.get("meta_title", ""),
            "meta_description": enriched.get("meta_description", ""),
            "short_description": enriched.get("short_description", ""),
            "long_description": enriched.get("long_description", ""),
            "faq_items": json.dumps(faq_items, default=str),
            "related_categories": json.dumps(related_categories, default=str),
        })

    async def _write_link_suggestions(self, cur, source_path: str, suggestions: list[dict]):
        """Write internal link suggestions."""
        page_prefix = source_path if "/" in source_path else f"/products/{source_path}"

        for link in suggestions:
            try:
                await cur.execute(WriteQueries.UPSERT_INTERNAL_LINK, {
                    "source_path": page_prefix,
                    "target_path": link.get("target_path", ""),
                    "anchor_text": link.get("anchor_text", ""),
                    "link_context": link.get("context", ""),
                    "link_type": link.get("link_type", "contextual"),
                })
            except Exception as e:
                logger.warning("Failed to write link suggestion",
                               source=page_prefix, target=link.get("target_path"), error=str(e))

    async def _trigger_revalidation(self, page_type: str, page_id: str):
        """Trigger Next.js ISR on-demand revalidation."""
        if not settings.nextjs_revalidate_url:
            logger.debug("No revalidation URL configured, skipping")
            return

        # Build the path to revalidate
        if page_type == "product":
            path = f"/products/{page_id}"
        else:
            path = page_id

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    settings.nextjs_revalidate_url,
                    json={
                        "path": path,
                        "secret": settings.nextjs_revalidate_secret,
                    },
                )
                if response.status_code == 200:
                    logger.info("ISR revalidation triggered", path=path)
                else:
                    logger.warning("ISR revalidation failed",
                                   path=path, status=response.status_code,
                                   body=response.text[:200])
        except Exception as e:
            logger.warning("ISR revalidation error", path=path, error=str(e))

    def _extract_after_content(self, page_type: str, enriched: dict) -> dict:
        """Extract the content fields from enrichment output for logging."""
        if page_type == "product":
            return {
                "meta_title": enriched.get("meta_title"),
                "meta_description": enriched.get("meta_description"),
                "title_override": enriched.get("title_override"),
                "description_html": enriched.get("description_html"),
                "top_description_html": enriched.get("top_description_html"),
                "bottom_description_html": enriched.get("bottom_description_html"),
                "bullet_points": enriched.get("bullet_points"),
            }
        else:
            return {
                "h1_title": enriched.get("h1_title"),
                "meta_title": enriched.get("meta_title"),
                "meta_description": enriched.get("meta_description"),
                "short_description": enriched.get("short_description"),
                "long_description": enriched.get("long_description"),
                "faq_items": enriched.get("faq_items"),
                "related_categories": enriched.get("related_categories"),
            }

    async def rollback(self, log_id: int) -> bool:
        """Rollback an enrichment using the before_content snapshot."""
        async with get_conn() as conn:
            async with conn.cursor() as cur:
                # Get the before content
                await cur.execute(EnrichmentLogQueries.ROLLBACK_ENRICHMENT, {"log_id": log_id})
                row = await cur.fetchone()

                if not row:
                    logger.error("Enrichment log not found", log_id=log_id)
                    return False

                before = json.loads(row["before_content"]) if isinstance(row["before_content"], str) else row["before_content"]
                page_type = row["page_type"]
                page_id = row["page_identifier"]

                # Restore previous content
                if page_type == "product":
                    await cur.execute(WriteQueries.UPSERT_PRODUCT_OVERRIDE, {
                        "product_handle": page_id,
                        **before,
                    })
                elif page_type == "collection":
                    await cur.execute(WriteQueries.UPDATE_COLLECTION_CONTENT, {
                        "url_path": page_id,
                        **before,
                    })

        # Trigger revalidation for the rolled-back page
        await self._trigger_revalidation(page_type, page_id)

        logger.info("Enrichment rolled back", log_id=log_id, page_type=page_type, page_id=page_id)
        return True
