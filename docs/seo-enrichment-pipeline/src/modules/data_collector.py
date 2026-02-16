"""Data collector: fetches GSC and GA4 metrics for pages.

GSC: queries, impressions, clicks, position, CTR per page
GA4: sessions, revenue, conversions, bounce rate per page
"""

from datetime import datetime, timedelta
from typing import Any
import json
import structlog

from google.oauth2 import service_account
from googleapiclient.discovery import build
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, Dimension, Metric,
    DateRange, FilterExpression, Filter,
)

from src.config.settings import settings
from src.utils.rate_limiter import gsc_limiter, ga4_limiter
from src.utils.retry import with_retry

logger = structlog.get_logger()

# ── GSC Scopes ──
GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
GA4_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]


class DataCollector:
    """Collects performance data from Google Search Console and GA4."""

    def __init__(self):
        self._gsc_service = None
        self._ga4_client = None

    def _get_gsc_service(self):
        """Lazy-init GSC service."""
        if self._gsc_service is None:
            creds = service_account.Credentials.from_service_account_file(
                settings.gsc_service_account_json,
                scopes=GSC_SCOPES,
            )
            self._gsc_service = build("searchconsole", "v1", credentials=creds)
        return self._gsc_service

    def _get_ga4_client(self):
        """Lazy-init GA4 client."""
        if self._ga4_client is None:
            creds = service_account.Credentials.from_service_account_file(
                settings.ga4_service_account_json,
                scopes=GA4_SCOPES,
            )
            self._ga4_client = BetaAnalyticsDataClient(credentials=creds)
        return self._ga4_client

    # ────────────────────────────────────────────────────────
    # GSC
    # ────────────────────────────────────────────────────────

    @with_retry(max_attempts=3)
    async def get_gsc_data_for_page(self, page_path: str) -> dict[str, Any]:
        """Fetch 30-day GSC data for a specific page.

        Returns:
            {
                "total_impressions": int,
                "total_clicks": int,
                "avg_position": float,
                "avg_ctr": float,
                "top_queries": [
                    {"query": str, "impressions": int, "clicks": int, "position": float, "ctr": float}
                ],
                "high_impression_low_position": [
                    {"query": str, "impressions": int, "position": float}  # pos > 10, impressions > threshold
                ],
                "high_impression_low_ctr": [
                    {"query": str, "impressions": int, "ctr": float, "position": float}
                ]
            }
        """
        await gsc_limiter.acquire()

        service = self._get_gsc_service()
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=settings.gsc_lookback_days)).strftime("%Y-%m-%d")

        full_url = f"{settings.gsc_site_url.rstrip('/')}{page_path}"

        # Query-level data for this page
        request_body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["query"],
            "dimensionFilterGroups": [{
                "filters": [{
                    "dimension": "page",
                    "operator": "equals",
                    "expression": full_url,
                }]
            }],
            "rowLimit": 100,
            "startRow": 0,
        }

        response = service.searchanalytics().query(
            siteUrl=settings.gsc_site_url,
            body=request_body,
        ).execute()

        rows = response.get("rows", [])

        # Aggregate metrics
        total_impressions = sum(r["impressions"] for r in rows)
        total_clicks = sum(r["clicks"] for r in rows)
        avg_position = (
            sum(r["position"] * r["impressions"] for r in rows) / total_impressions
            if total_impressions > 0 else 0
        )
        avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0

        # Process per-query data
        top_queries = []
        high_imp_low_pos = []
        high_imp_low_ctr = []

        for row in rows:
            query = row["keys"][0]
            q_data = {
                "query": query,
                "impressions": row["impressions"],
                "clicks": row["clicks"],
                "position": round(row["position"], 1),
                "ctr": round(row["ctr"], 4),
            }
            top_queries.append(q_data)

            # Quick win: lots of impressions but not on page 1
            if row["impressions"] >= 50 and row["position"] > 10:
                high_imp_low_pos.append({
                    "query": query,
                    "impressions": row["impressions"],
                    "position": round(row["position"], 1),
                })

            # CTR optimization: visible but not getting clicked
            if row["impressions"] >= 100 and row["ctr"] < 0.02 and row["position"] <= 10:
                high_imp_low_ctr.append({
                    "query": query,
                    "impressions": row["impressions"],
                    "ctr": round(row["ctr"], 4),
                    "position": round(row["position"], 1),
                })

        # Sort queries by impressions
        top_queries.sort(key=lambda q: q["impressions"], reverse=True)
        high_imp_low_pos.sort(key=lambda q: q["impressions"], reverse=True)
        high_imp_low_ctr.sort(key=lambda q: q["impressions"], reverse=True)

        return {
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "avg_position": round(avg_position, 1),
            "avg_ctr": round(avg_ctr, 4),
            "top_queries": top_queries[:20],
            "high_impression_low_position": high_imp_low_pos[:10],
            "high_impression_low_ctr": high_imp_low_ctr[:10],
        }

    @with_retry(max_attempts=3)
    async def get_gsc_queries_for_page(self, page_path: str, top_n: int = 5) -> list[str]:
        """Get the top N queries for a page (for SERP analysis)."""
        data = await self.get_gsc_data_for_page(page_path)
        queries = data.get("top_queries", [])

        # Prioritize: quick wins first, then by impressions
        quick_wins = {q["query"] for q in data.get("high_impression_low_position", [])}
        prioritized = sorted(
            queries,
            key=lambda q: (q["query"] in quick_wins, q["impressions"]),
            reverse=True,
        )
        return [q["query"] for q in prioritized[:top_n]]

    # ────────────────────────────────────────────────────────
    # GA4
    # ────────────────────────────────────────────────────────

    @with_retry(max_attempts=3)
    async def get_ga4_data_for_page(self, page_path: str) -> dict[str, Any]:
        """Fetch 30-day GA4 data for a specific page.

        Returns:
            {
                "sessions": int,
                "revenue": float,
                "conversions": int,
                "bounce_rate": float,
                "avg_session_duration": float,
                "add_to_carts": int,
                "transactions": int,
            }
        """
        await ga4_limiter.acquire()

        client = self._get_ga4_client()
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=settings.gsc_lookback_days)).strftime("%Y-%m-%d")

        request = RunReportRequest(
            property=settings.ga4_property_id,
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[Dimension(name="pagePath")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalRevenue"),
                Metric(name="conversions"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
                Metric(name="addToCarts"),
                Metric(name="transactions"),
            ],
            dimension_filter=FilterExpression(
                filter=Filter(
                    field_name="pagePath",
                    string_filter=Filter.StringFilter(
                        match_type=Filter.StringFilter.MatchType.EXACT,
                        value=page_path,
                    ),
                )
            ),
        )

        response = client.run_report(request)

        if not response.rows:
            return {
                "sessions": 0, "revenue": 0.0, "conversions": 0,
                "bounce_rate": 0.0, "avg_session_duration": 0.0,
                "add_to_carts": 0, "transactions": 0,
            }

        row = response.rows[0]
        metrics = row.metric_values

        return {
            "sessions": int(metrics[0].value),
            "revenue": float(metrics[1].value),
            "conversions": int(metrics[2].value),
            "bounce_rate": round(float(metrics[3].value), 4),
            "avg_session_duration": round(float(metrics[4].value), 1),
            "add_to_carts": int(metrics[5].value),
            "transactions": int(metrics[6].value),
        }
