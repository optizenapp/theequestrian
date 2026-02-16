"""Enrichment Engine: orchestrates Claude-powered content generation.

Takes performance data + SERP analysis + current content → enriched content.
Writes results to DB and logs everything for audit/rollback.
"""

import asyncio
import json
import re
from typing import Any
import structlog
import anthropic

from src.config.settings import settings
from src.db.connection import get_cursor
from src.db.queries import PageQueries, WriteQueries, EnrichmentLogQueries
from src.prompts.content_enrichment import (
    build_product_enrichment_prompt,
    build_collection_enrichment_prompt,
)
from src.utils.rate_limiter import claude_limiter
from src.utils.retry import with_retry

logger = structlog.get_logger()

# Claude Sonnet pricing (per 1K tokens) — update as needed
SONNET_INPUT_COST_PER_1K = 0.003
SONNET_OUTPUT_COST_PER_1K = 0.015


class EnrichmentEngine:
    """Generates enriched content using Claude and Koray framework."""

    def __init__(self):
        self._claude = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def enrich_page(
        self,
        queue_item: dict,
        serp_analysis: dict,
    ) -> dict | None:
        """Enrich a single page (product or collection).

        Args:
            queue_item: Row from enrichment_queue with gsc_data, ga4_data
            serp_analysis: Combined SERP analysis for this page's queries

        Returns:
            Enriched content dict, or None if failed
        """
        page_type = queue_item["page_type"]
        page_id = queue_item["page_identifier"]

        logger.info("Enriching page", page_type=page_type, page_id=page_id)

        try:
            if page_type == "product":
                return await self._enrich_product(queue_item, serp_analysis)
            elif page_type == "collection":
                return await self._enrich_collection(queue_item, serp_analysis)
            else:
                logger.error("Unknown page type", page_type=page_type)
                return None
        except Exception as e:
            logger.error("Enrichment failed", page_type=page_type, page_id=page_id, error=str(e))
            raise

    async def _enrich_product(self, queue_item: dict, serp_analysis: dict) -> dict:
        """Enrich a product page."""
        handle = queue_item["page_identifier"]

        # 1. Fetch current product data
        async with get_cursor() as cur:
            await cur.execute(PageQueries.PRODUCT_ENRICHMENT_VIEW, {"handle": handle})
            product_data = await cur.fetchone()

        if not product_data:
            logger.warning("Product not found", handle=handle)
            return None

        product_data = dict(product_data)

        # 2. Get existing internal links
        existing_links = await self._get_existing_links(f"/products/{handle}")

        # 3. Build prompt
        gsc_data = json.loads(queue_item["gsc_data"]) if isinstance(queue_item["gsc_data"], str) else queue_item["gsc_data"]
        ga4_data = json.loads(queue_item["ga4_data"]) if isinstance(queue_item["ga4_data"], str) else queue_item["ga4_data"]
        categories = product_data.get("categories", [])
        if isinstance(categories, str):
            categories = json.loads(categories)

        messages, system_msg = build_product_enrichment_prompt(
            product_data=product_data,
            gsc_data=gsc_data,
            ga4_data=ga4_data,
            serp_analysis=serp_analysis,
            category_context=categories,
            existing_internal_links=existing_links,
        )

        # 4. Call Claude
        enriched = await self._call_claude(messages, system_msg)
        if not enriched:
            return None

        # 5. Validate output
        enriched = self._validate_product_output(enriched)

        # 6. Log before/after
        before_content = {
            "meta_title": product_data.get("meta_title"),
            "meta_description": product_data.get("meta_description"),
            "title_override": product_data.get("title_override"),
            "description_html": product_data.get("description_html"),
            "top_description_html": product_data.get("top_description_html"),
            "bottom_description_html": product_data.get("bottom_description_html"),
            "bullet_points": product_data.get("bullet_points"),
        }

        enriched["_before_content"] = before_content
        enriched["_page_type"] = "product"
        enriched["_page_identifier"] = handle

        return enriched

    async def _enrich_collection(self, queue_item: dict, serp_analysis: dict) -> dict:
        """Enrich a collection page."""
        url_path = queue_item["page_identifier"]

        # 1. Fetch current collection data
        async with get_cursor() as cur:
            await cur.execute(PageQueries.COLLECTION_ENRICHMENT_VIEW, {"url_path": url_path})
            collection_data = await cur.fetchone()

        if not collection_data:
            logger.warning("Collection not found", url_path=url_path)
            return None

        collection_data = dict(collection_data)

        # 2. Parse JSON fields
        siblings = collection_data.get("sibling_collections", [])
        children = collection_data.get("child_collections", [])
        if isinstance(siblings, str):
            siblings = json.loads(siblings)
        if isinstance(children, str):
            children = json.loads(children)

        # 3. Get sample products in this collection
        sample_products = await self._get_sample_products(url_path)

        # 4. Get existing internal links
        existing_links = await self._get_existing_links(url_path)

        # 5. Build prompt
        gsc_data = json.loads(queue_item["gsc_data"]) if isinstance(queue_item["gsc_data"], str) else queue_item["gsc_data"]
        ga4_data = json.loads(queue_item["ga4_data"]) if isinstance(queue_item["ga4_data"], str) else queue_item["ga4_data"]

        messages, system_msg = build_collection_enrichment_prompt(
            collection_data=collection_data,
            gsc_data=gsc_data,
            ga4_data=ga4_data,
            serp_analysis=serp_analysis,
            sibling_collections=siblings,
            child_collections=children,
            sample_products=sample_products,
            existing_internal_links=existing_links,
        )

        # 6. Call Claude
        enriched = await self._call_claude(messages, system_msg)
        if not enriched:
            return None

        # 7. Validate
        enriched = self._validate_collection_output(enriched)

        # 8. Log before/after
        before_content = {
            "h1_title": collection_data.get("h1_title"),
            "meta_title": collection_data.get("meta_title"),
            "meta_description": collection_data.get("meta_description"),
            "short_description": collection_data.get("short_description"),
            "long_description": collection_data.get("long_description"),
            "faq_items": collection_data.get("faq_items"),
            "related_categories": collection_data.get("related_categories"),
        }

        enriched["_before_content"] = before_content
        enriched["_page_type"] = "collection"
        enriched["_page_identifier"] = url_path

        return enriched

    @with_retry(max_attempts=2)
    async def _call_claude(self, messages: list[dict], system_msg: str) -> dict | None:
        """Call Claude API and parse JSON response."""
        await claude_limiter.acquire()

        response = await self._claude.messages.create(
            model=settings.claude_model,
            max_tokens=settings.claude_max_tokens,
            system=system_msg,
            messages=messages,
        )

        raw_text = response.content[0].text
        usage = response.usage

        # Calculate cost
        cost = (
            (usage.input_tokens / 1000) * SONNET_INPUT_COST_PER_1K
            + (usage.output_tokens / 1000) * SONNET_OUTPUT_COST_PER_1K
        )

        logger.info("Claude response received",
                     input_tokens=usage.input_tokens,
                     output_tokens=usage.output_tokens,
                     cost_usd=round(cost, 4))

        # Parse JSON from response
        try:
            # Try direct parse first
            result = json.loads(raw_text)
        except json.JSONDecodeError:
            # Try extracting JSON block
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', raw_text)
            if json_match:
                result = json.loads(json_match.group(1))
            else:
                json_match = re.search(r'\{[\s\S]*\}', raw_text)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    logger.error("Failed to parse Claude response as JSON")
                    return None

        # Attach usage metadata
        result["_usage"] = {
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "cost_usd": round(cost, 4),
            "model": settings.claude_model,
        }

        return result

    def _validate_product_output(self, enriched: dict) -> dict:
        """Validate and sanitize product enrichment output."""
        # Enforce meta_title length
        mt = enriched.get("meta_title", "")
        if len(mt) > 60:
            enriched["meta_title"] = mt[:57] + "..."

        # Enforce meta_description length
        md = enriched.get("meta_description", "")
        if len(md) > 155:
            enriched["meta_description"] = md[:152] + "..."

        # Ensure bullet_points is a list
        bp = enriched.get("bullet_points", [])
        if not isinstance(bp, list):
            enriched["bullet_points"] = []

        return enriched

    def _validate_collection_output(self, enriched: dict) -> dict:
        """Validate and sanitize collection enrichment output."""
        # Same meta tag length enforcement
        mt = enriched.get("meta_title", "")
        if len(mt) > 60:
            enriched["meta_title"] = mt[:57] + "..."

        md = enriched.get("meta_description", "")
        if len(md) > 155:
            enriched["meta_description"] = md[:152] + "..."

        # Ensure faq_items is a list of proper objects
        faqs = enriched.get("faq_items", [])
        if isinstance(faqs, list):
            enriched["faq_items"] = [
                f for f in faqs
                if isinstance(f, dict) and "question" in f and "answer" in f
            ]

        # Ensure related_categories is a list
        rc = enriched.get("related_categories", [])
        if not isinstance(rc, list):
            enriched["related_categories"] = []

        return enriched

    async def _get_existing_links(self, page_path: str) -> list[dict]:
        """Get existing internal links for a page."""
        async with get_cursor() as cur:
            await cur.execute("""
                SELECT target_path, anchor_text, link_type
                FROM internal_link_graph
                WHERE source_path = %(path)s
                ORDER BY created_at DESC
                LIMIT 20
            """, {"path": page_path})
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    async def _get_sample_products(self, collection_url_path: str, limit: int = 10) -> list[dict]:
        """Get sample products from a collection for context."""
        async with get_cursor() as cur:
            await cur.execute("""
                SELECT
                    p.handle, p.title, p.product_type, p.vendor,
                    co.meta_title, co.bullet_points
                FROM product_category_assignments pca
                JOIN products p ON p.handle = pca.product_handle
                LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
                WHERE pca.canonical_path = %(path)s
                   OR pca.category_path = %(path)s
                LIMIT %(limit)s
            """, {"path": collection_url_path, "limit": limit})
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
