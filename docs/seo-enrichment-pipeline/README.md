# SEO Enrichment Pipeline

## Architecture Overview

An always-running EC2 service that automatically enriches ~300 product and collection pages per day
using GSC/GA4 performance data, SERP competitive analysis, and Claude-powered content generation
following Koray Tuğberk Gübür's Semantic SEO / Topical Authority principles.

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SCHEDULER (cron)                             │
│                   Runs daily, picks ~300 pages                      │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  1. DATA COLLECTION MODULE                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐     │
│  │  GSC API     │  │  GA4 API     │  │  Current DB Content   │     │
│  │  - queries   │  │  - sessions  │  │  - product overrides  │     │
│  │  - impressns │  │  - revenue   │  │  - collection content │     │
│  │  - clicks    │  │  - conv rate │  │  - category mappings  │     │
│  │  - positions │  │  - bounce    │  │  - internal links     │     │
│  │  - CTR       │  │  - events    │  │                       │     │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘     │
│         └─────────────────┼──────────────────────┘                  │
│                           ▼                                         │
│              Page Performance Profile                               │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  2. SERP ANALYSIS MODULE                            │
│                                                                     │
│  For each page's top queries:                                       │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐  │
│  │  Puppeteer        │    │  Claude Analysis (per competitor)   │  │
│  │  - Crawl page 1   │    │  - NLP compliance score             │  │
│  │  - Extract top 10 │    │  - Semantic relevance               │  │
│  │  - Get content    │    │  - E-A-V coverage                   │  │
│  │  - Get structure  │    │  - Topical authority signals         │  │
│  │  - Get links      │    │  - Internal linking patterns         │  │
│  └────────┬─────────┘    │  - Content structure quality          │  │
│           └──────────────│  - Heading-as-questions score         │  │
│                          │  - Extractive answer quality           │  │
│                          └──────────────┬───────────────────────┘  │
│                                         ▼                           │
│                          Competitive Intelligence Report            │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  3. ENRICHMENT ENGINE                                │
│                                                                     │
│  Claude (Sonnet) with Koray Framework system prompt:                │
│                                                                     │
│  Inputs:                          │  Outputs:                       │
│  - Performance profile            │  - Optimized meta_title         │
│  - Competitive analysis           │  - Optimized meta_description   │
│  - Current page content           │  - Enriched description_html    │
│  - Category/topical context       │  - top/bottom descriptions      │
│  - Internal link graph            │  - Structured bullet_points     │
│  - Topical map position           │  - FAQ items (collections)      │
│  - Related products/categories    │  - Internal link suggestions    │
│                                   │  - Related categories updates   │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  4. DB WRITER + REVALIDATION                        │
│                                                                     │
│  ┌─────────────────────┐    ┌────────────────────────────────────┐ │
│  │  Write to Postgres   │    │  Trigger ISR Revalidation          │ │
│  │  - product_content_  │    │  - POST /api/revalidate            │ │
│  │    overrides         │    │  - Tag-based or path-based         │ │
│  │  - collection_       │    │  - Batch after all writes          │ │
│  │    content           │    │                                    │ │
│  │  - Set use_headless  │    │                                    │ │
│  │    flags = true      │    │                                    │ │
│  └─────────────────────┘    └────────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Audit Log (enrichment_log table)                            │   │
│  │  - before/after snapshots                                    │   │
│  │  - scores, reasoning                                         │   │
│  │  - rollback capability                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
seo-enrichment-pipeline/
├── src/
│   ├── main.py                    # Entry point + scheduler
│   ├── config/
│   │   └── settings.py            # All configuration
│   ├── db/
│   │   ├── connection.py          # Postgres connection pool
│   │   ├── queries.py             # All SQL queries
│   │   └── migrations.py          # New tables (enrichment_log, enrichment_queue)
│   ├── modules/
│   │   ├── page_selector.py       # Picks ~300 pages/day based on priority
│   │   ├── data_collector.py      # GSC + GA4 API integration
│   │   ├── serp_analyzer.py       # Puppeteer SERP crawl + Claude classification
│   │   ├── enrichment_engine.py   # Claude content generation
│   │   └── db_writer.py           # Write enriched content + trigger ISR
│   ├── prompts/
│   │   ├── serp_analysis.py       # Prompt for analyzing SERP competitors
│   │   └── content_enrichment.py  # Prompt for generating enriched content
│   └── utils/
│       ├── logger.py              # Structured logging
│       ├── rate_limiter.py        # API rate limiting
│       └── retry.py               # Retry with backoff
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

## Setup

```bash
# 1. Clone and install
pip install -r requirements.txt

# 2. Install Playwright browsers
playwright install chromium

# 3. Configure environment
cp .env.example .env
# Fill in API keys and DB credentials

# 4. Run migrations
python -m src.db.migrations

# 5. Start the pipeline
python -m src.main
```

## Environment Variables

See `.env.example` for all required configuration.
