"""SERP Analyzer: crawls Google page 1 and classifies competitors with Claude.

For each target query:
1. Use Playwright to crawl Google page 1
2. Extract top 10 organic results (title, description, URL)
3. Fetch and extract content from each result
4. Send to Claude for classification on Koray framework criteria
"""

import asyncio
import json
import re
from typing import Any
from urllib.parse import urlparse
import structlog

from playwright.async_api import async_playwright, Browser, Page
from bs4 import BeautifulSoup
import httpx
import anthropic

from src.config.settings import settings
from src.db.connection import get_cursor
from src.db.queries import SerpCacheQueries
from src.prompts.serp_analysis import build_serp_analysis_prompt
from src.utils.rate_limiter import serp_limiter, claude_limiter
from src.utils.retry import with_retry

logger = structlog.get_logger()


class SerpAnalyzer:
    """Crawls SERPs and analyzes competitors using Claude."""

    def __init__(self):
        self._browser: Browser | None = None
        self._claude = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def _get_browser(self) -> Browser:
        """Lazy-init Playwright browser."""
        if self._browser is None:
            pw = await async_playwright().start()
            self._browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )
        return self._browser

    async def close(self):
        """Clean up browser."""
        if self._browser:
            await self._browser.close()
            self._browser = None

    async def analyze_queries(self, queries: list[str]) -> dict[str, Any]:
        """Analyze SERP for multiple queries, return combined intelligence.

        Returns:
            {
                "query_analyses": {
                    "query string": {
                        "serp_results": [...],
                        "competitor_analysis": [...],
                        "content_gaps": [...],
                        "recommended_approach": str,
                    }
                },
                "combined_insights": {
                    "common_patterns": [...],
                    "differentiation_opportunities": [...],
                    "internal_linking_targets": [...],
                }
            }
        """
        query_analyses = {}

        for query in queries:
            logger.info("Analyzing SERP", query=query)

            # Check cache first
            cached = await self._get_cached(query)
            if cached:
                query_analyses[query] = cached
                logger.info("Using cached SERP analysis", query=query)
                continue

            try:
                # 1. Crawl Google SERP
                serp_results = await self._crawl_serp(query)

                if not serp_results:
                    logger.warning("No SERP results found", query=query)
                    continue

                # 2. Fetch content from top results
                enriched_results = await self._fetch_result_content(serp_results)

                # 3. Classify with Claude
                analysis = await self._classify_with_claude(query, enriched_results)

                query_analyses[query] = {
                    "serp_results": enriched_results,
                    "competitor_analysis": analysis,
                }

                # Cache it
                await self._cache_results(query, enriched_results, analysis)

            except Exception as e:
                logger.error("SERP analysis failed for query", query=query, error=str(e))
                continue

        return {
            "query_analyses": query_analyses,
        }

    @with_retry(max_attempts=2)
    async def _crawl_serp(self, query: str) -> list[dict]:
        """Crawl Google page 1 for a query."""
        await serp_limiter.acquire()

        browser = await self._get_browser()
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        try:
            search_url = f"https://www.google.com/search?q={query}&num=10&hl=en"
            await page.goto(search_url, wait_until="networkidle", timeout=30000)

            # Wait for results
            await page.wait_for_selector("div#search", timeout=10000)

            # Extract organic results
            results = await page.evaluate("""
                () => {
                    const results = [];
                    // Target organic result containers
                    const items = document.querySelectorAll('div#search div.g');

                    for (const item of items) {
                        const linkEl = item.querySelector('a[href^="http"]');
                        const titleEl = item.querySelector('h3');
                        const snippetEl = item.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe');

                        if (linkEl && titleEl) {
                            results.push({
                                url: linkEl.href,
                                title: titleEl.textContent?.trim() || '',
                                snippet: snippetEl?.textContent?.trim() || '',
                                position: results.length + 1,
                            });
                        }
                        if (results.length >= 10) break;
                    }
                    return results;
                }
            """)

            logger.info(f"Extracted {len(results)} SERP results", query=query)
            return results

        except Exception as e:
            logger.error("SERP crawl failed", query=query, error=str(e))
            raise
        finally:
            await context.close()

    async def _fetch_result_content(self, results: list[dict]) -> list[dict]:
        """Fetch and extract main content from each SERP result."""
        enriched = []
        async with httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0)"},
        ) as client:
            for result in results[:settings.serp_results_to_crawl]:
                try:
                    resp = await client.get(result["url"])
                    if resp.status_code == 200:
                        content = self._extract_page_content(resp.text)
                        result["extracted_content"] = content
                    else:
                        result["extracted_content"] = {"error": f"HTTP {resp.status_code}"}
                except Exception as e:
                    result["extracted_content"] = {"error": str(e)}

                enriched.append(result)

        return enriched

    def _extract_page_content(self, html: str) -> dict:
        """Extract structured content from an HTML page."""
        soup = BeautifulSoup(html, "lxml")

        # Remove script/style/nav/footer
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Extract heading structure
        headings = []
        for level in range(1, 7):
            for h in soup.find_all(f"h{level}"):
                headings.append({
                    "level": level,
                    "text": h.get_text(strip=True),
                })

        # Extract meta
        meta_title = ""
        title_tag = soup.find("title")
        if title_tag:
            meta_title = title_tag.get_text(strip=True)

        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"})
        if meta_tag:
            meta_desc = meta_tag.get("content", "")

        # Extract main content text (truncated for Claude token efficiency)
        main_content = ""
        for selector in ["main", "article", '[role="main"]', "#content", ".content"]:
            main_el = soup.select_one(selector)
            if main_el:
                main_content = main_el.get_text(separator="\n", strip=True)
                break
        if not main_content:
            body = soup.find("body")
            if body:
                main_content = body.get_text(separator="\n", strip=True)

        # Truncate to ~2000 chars for token efficiency
        main_content = main_content[:2000]

        # Extract internal links
        internal_links = []
        domain = ""
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/") or (domain and domain in href):
                internal_links.append({
                    "href": href,
                    "text": a.get_text(strip=True)[:100],
                })

        # Count FAQ/Q&A schema
        has_faq_schema = bool(soup.find("script", type="application/ld+json",
                                        string=re.compile("FAQPage", re.I)))

        return {
            "meta_title": meta_title[:200],
            "meta_description": meta_desc[:300],
            "headings": headings[:30],
            "content_preview": main_content,
            "internal_link_count": len(internal_links),
            "internal_links_sample": internal_links[:10],
            "has_faq_schema": has_faq_schema,
            "word_count": len(main_content.split()),
        }

    async def _classify_with_claude(self, query: str, results: list[dict]) -> dict:
        """Send SERP results to Claude for classification on Koray criteria."""
        await claude_limiter.acquire()

        prompt = build_serp_analysis_prompt(query, results)

        response = await self._claude.messages.create(
            model=settings.claude_model,
            max_tokens=settings.claude_max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        # Parse Claude's response (expected JSON)
        raw_text = response.content[0].text
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', raw_text)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                analysis = {"raw_analysis": raw_text}
        except json.JSONDecodeError:
            analysis = {"raw_analysis": raw_text}

        logger.info("SERP classified",
                     query=query,
                     tokens_in=response.usage.input_tokens,
                     tokens_out=response.usage.output_tokens)

        return analysis

    async def _get_cached(self, query: str) -> dict | None:
        """Check SERP cache."""
        async with get_cursor() as cur:
            await cur.execute(SerpCacheQueries.GET_CACHED, {"query": query})
            row = await cur.fetchone()
            if row:
                return {
                    "serp_results": row["results"],
                    "competitor_analysis": row["analysis"],
                }
        return None

    async def _cache_results(self, query: str, results: list, analysis: dict):
        """Cache SERP results."""
        async with get_cursor() as cur:
            await cur.execute(SerpCacheQueries.UPSERT_CACHE, {
                "query": query,
                "results": json.dumps(results, default=str),
                "analysis": json.dumps(analysis, default=str),
            })
