# SEO Enrichment Rollout Runbook

## What This Covers

- Table initialization for the enrichment pipeline.
- Dry-run, shadow, and apply workflows.
- EC2 deployment pattern (systemd-managed worker).
- Quality gates and rollback procedures.

## Prerequisites

- `POSTGRES_URL` or `DATABASE_URL` configured.
- `OPENAI_API_KEY` configured for `shadow` and `apply` modes.
- Analytics credentials (optional for initial rollout, required for full scoring quality):
  - `GSC_SITE_URL`
  - `GSC_SERVICE_ACCOUNT_JSON`
  - `GA4_SERVICE_ACCOUNT_JSON`
  - `GA4_PROPERTY_ID`
- Revalidation config for live apply:
  - `SEO_ENRICHMENT_REVALIDATE_BASE_URL`
  - `INTERNAL_REVALIDATE_SECRET` (or `REVALIDATE_SECRET`)

## Initialization

1. Initialize pipeline tables:
   - `npm run seo:enrichment:init`
2. Validate table creation in DB:
   - `enrichment_queue`
   - `enrichment_log`
   - `serp_cache`
   - `page_metrics_history`
   - `internal_link_graph`

## Operating Modes

- `dry-run`: generate/score/log behavior without DB content writes.
- `shadow`: writes to `enrichment_log` only (`applied=false`) for editorial inspection.
- `apply`: writes to content tables and triggers revalidation.

Commands:

- Dry-run one-shot:
  - `npm run seo:enrichment:dry`
- Shadow one-shot:
  - `npm run seo:enrichment:shadow`
- Apply one-shot:
  - `npm run seo:enrichment:apply`
- Start continuous worker:
  - `npm run seo:enrichment:worker`

## Rollout Phases

### Phase A: Dry-run Validation (no writes)

- Run:
  - `npm run seo:enrichment:dry`
- Verify:
  - queue fills and processes without failures.
  - no content rows changed in `product_content_overrides` / `collection_content`.

Quality gate:
- processing failure rate < 5%.
- JSON validation failures < 2%.

### Phase B: Shadow Mode (audit only)

- Run:
  - `npm run seo:enrichment:shadow`
- Verify:
  - `enrichment_log` rows created with `applied=false`.
  - editorial spot-check top 20 entries for quality.

Quality gate:
- editorial acceptance >= 80% on sampled rows.
- no malformed HTML in sampled outputs.

### Phase C: Apply Mode (small cohort)

- Configure small daily batch size (`SEO_ENRICHMENT_DAILY_BATCH_SIZE=20`).
- Run:
  - `npm run seo:enrichment:apply`
- Verify:
  - content writes visible on target URLs.
  - revalidate endpoint responds successfully.
  - no material increase in 404/redirect anomalies.

Quality gate:
- apply failures < 3%.
- rollback test succeeds for at least 1 product and 1 collection.

### Phase D: Scale Up

- Increase batch size gradually (20 -> 50 -> 100+).
- Keep `SEO_ENRICHMENT_MAX_CONCURRENCY` conservative at first.
- Continue weekly editorial audit samples.

## EC2 Deployment (systemd)

Use a dedicated worker process managed by `systemd`.

Example unit file:

```ini
[Unit]
Description=SEO Enrichment Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/theequestrian
EnvironmentFile=/var/www/theequestrian/.env.production
ExecStart=/usr/bin/npm run seo:enrichment:worker
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
User=ec2-user

[Install]
WantedBy=multi-user.target
```

Recommended setup:

- one service for continuous worker (`seo:enrichment:worker`).
- optional cron for daily explicit selection (`seo:enrichment:select`) if you separate scheduling concerns.
- CloudWatch or journal shipping for log retention.

## EC2 Smoke Test

Run this from the app directory on EC2 after env vars are set:

- Dry-run smoke:
  - `npm run seo:enrichment:ec2:smoke`
- Shadow smoke:
  - `npx tsx scripts/seo-enrichment-ec2-smoke.ts --mode=shadow`
- Apply smoke (only after dry + shadow pass):
  - `npx tsx scripts/seo-enrichment-ec2-smoke.ts --mode=apply`

Expected outcomes:

- `enrichment_queue` contains claimed/completed rows.
- `enrichment_log` has new entries (with `applied=false` in shadow, `applied=true` in apply).
- `enrichment_log.koray_framework_version` and `koray_rule_ids_used` are populated.
- `after_scores.korayCompliance` includes compliance score and failed checks.
- In apply mode, updated fields appear in:
  - `product_content_overrides`
  - `collection_content`

## Monitoring Checklist

- Queue depth (`enrichment_queue` pending count).
- Error rate (`failed` items and `retry_count` trends).
- Throughput (completed/day).
- Cost trend (`enrichment_log.total_cost_usd`).
- Search impact sample:
  - CTR delta for high-impression pages.
  - average position movement for quick-win queries.

## Rollback

Rollback a single enrichment by log id:

- `npm run seo:enrichment:rollback -- --log-id=<id>`

After rollback:

- verify restored fields in target table.
- verify page refresh via revalidation path if needed.

## Safety Defaults

- Keep initial mode in `dry-run`.
- Keep `SEO_ENRICHMENT_ENABLE_SERP=false` until base pipeline quality is stable.
- Enable `apply` only when quality gates are consistently met.

