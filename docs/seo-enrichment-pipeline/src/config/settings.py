"""Pipeline configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database
    database_url: str
    database_pool_min: int = 2
    database_pool_max: int = 10

    # Google Search Console
    gsc_service_account_json: str
    gsc_site_url: str

    # Google Analytics 4
    ga4_service_account_json: str
    ga4_property_id: str  # e.g. "properties/123456789"

    # Anthropic
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4096

    # Next.js revalidation
    nextjs_revalidate_url: str = ""
    nextjs_revalidate_secret: str = ""

    # Pipeline
    daily_batch_size: int = 300
    enrichment_interval_days: int = 30
    max_concurrent_serp_crawls: int = 5
    max_concurrent_claude_calls: int = 3
    serp_crawl_delay_ms: int = 2000

    # Logging
    log_level: str = "INFO"
    log_file: str = "/var/log/seo-enrichment/pipeline.log"

    # GSC data window
    gsc_lookback_days: int = 30

    # SERP analysis
    serp_top_n_queries: int = 5  # how many top queries to analyze per page
    serp_results_to_crawl: int = 10  # top N google results to crawl

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
