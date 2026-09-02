#!/usr/bin/env tsx
/**
 * One-off script: enrich ALL published category (collection) pages.
 *
 * Runs locally against the production DB using .env.local credentials.
 * GA4 data will be empty if GA4_SERVICE_ACCOUNT_JSON is not set — that's fine,
 * the engine falls back to zero metrics gracefully.
 *
 * Usage:
 *   npx tsx scripts/enrich-all-categories.ts
 *   npx tsx scripts/enrich-all-categories.ts --concurrency=6
 *   npx tsx scripts/enrich-all-categories.ts --skip-enriched   # skip already-enriched
 *   npx tsx scripts/enrich-all-categories.ts --dry-run         # force dry-run mode
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Must be set BEFORE importing config module so it reads 'apply'
if (!process.argv.includes('--dry-run') && !process.env.SEO_ENRICHMENT_MODE) {
  process.env.SEO_ENRICHMENT_MODE = 'apply';
}

import * as fs from 'fs';
import * as path from 'path';
import { sql } from '@/lib/db/vercel-postgres';
import { AnalyticsCollector } from '@/lib/seo-enrichment/collector';
import { EnrichmentEngine } from '@/lib/seo-enrichment/engine';
import { EnrichmentWriter } from '@/lib/seo-enrichment/writer';
import { markQueueCompleted, markQueueFailed } from '@/lib/seo-enrichment/db';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import { log } from '@/lib/seo-enrichment/logger';
import { SerpAnalyzer } from '@/lib/seo-enrichment/serp';
import type { GscMetrics, Ga4Metrics, QueueItem } from '@/lib/seo-enrichment/types';

function getArg(flag: string): string | undefined {
  const match = process.argv.find((a) => a.startsWith(`${flag}=`));
  return match ? match.split('=').slice(1).join('=') : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const CONCURRENCY = Math.max(1, parseInt(getArg('--concurrency') || '4', 10));
const SKIP_ENRICHED = hasFlag('--skip-enriched');
const LIMIT = getArg('--limit') ? Math.max(1, parseInt(getArg('--limit')!, 10)) : null;

const emptyGsc: GscMetrics = {
  totalImpressions: 0, totalClicks: 0, avgPosition: 0, avgCtr: 0,
  topQueries: [], highImpressionLowPosition: [], highImpressionLowCtr: [],
};
const emptyGa4: Ga4Metrics = {
  sessions: 0, revenue: 0, conversions: 0, bounceRate: 0,
  avgSessionDuration: 0, addToCarts: 0, transactions: 0,
};

async function insertQueueRow(urlPath: string, gsc: GscMetrics, ga4: Ga4Metrics): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await sql.query<{ id: number }>(`
    INSERT INTO enrichment_queue (
      page_type, page_identifier, canonical_path,
      priority_score, priority_reasons, gsc_data, ga4_data,
      scheduled_for_day, scheduled_for, status
    ) VALUES (
      'collection', $1, $1,
      9999, $2::jsonb, $3::jsonb, $4::jsonb,
      $5::date, NOW(), 'processing'
    )
    ON CONFLICT (page_type, page_identifier, scheduled_for_day)
    DO UPDATE SET
      status = 'processing',
      started_at = NOW(),
      updated_at = NOW(),
      priority_score = 9999
    RETURNING id
  `, [
    urlPath,
    JSON.stringify({ bulk_category_run: true }),
    JSON.stringify(gsc),
    JSON.stringify(ga4),
    today,
  ]);
  return result.rows[0].id;
}

function makeQueueItem(id: number, urlPath: string, gsc: GscMetrics, ga4: Ga4Metrics): QueueItem {
  return {
    id,
    page_type: 'collection',
    page_identifier: urlPath,
    canonical_path: urlPath,
    priority_score: 9999,
    priority_reasons: { bulk_category_run: true },
    gsc_data: gsc,
    ga4_data: ga4,
  };
}

async function processWithLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await fn(items[i], i);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}

async function main() {
  console.log(`\n=== Enrich All Categories ===`);
  console.log(`Mode: ${seoEnrichmentConfig.mode}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Skip already enriched: ${SKIP_ENRICHED}`);

  if (seoEnrichmentConfig.mode === 'dry-run') {
    console.log(`\n⚠  Running in dry-run mode — no content will be written to the DB.`);
    console.log(`   Pass --dry-run explicitly or set SEO_ENRICHMENT_MODE=apply to apply changes.\n`);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required. Add it to .env.local.');
  }

  // Fetch all published collections (optionally skip already-enriched ones)
  const collectionsResult = await sql.query<{ url_path: string }>(`
    SELECT cc.url_path
    FROM collection_content cc
    WHERE cc.status = 'published'
    ${SKIP_ENRICHED ? `
      AND NOT EXISTS (
        SELECT 1 FROM enrichment_log el
        WHERE el.page_type = 'collection'
          AND el.page_identifier = cc.url_path
          AND el.applied = TRUE
      )
    ` : ''}
    ORDER BY cc.url_path ASC
  `);

  let collections = collectionsResult.rows.map((r) => r.url_path);
  if (LIMIT !== null) collections = collections.slice(0, LIMIT);
  const total = collections.length;

  if (total === 0) {
    console.log('No collections to enrich. All done!');
    return;
  }

  console.log(`\nCollections to enrich: ${total}\n`);

  const collector = new AnalyticsCollector();
  const engine = new EnrichmentEngine();
  const writer = new EnrichmentWriter();
  const serp = new SerpAnalyzer();

  let done = 0;
  let succeeded = 0;
  let failed = 0;
  let totalCost = 0;
  const errors: Array<{ urlPath: string; error: string }> = [];
  const completedPages: Array<{ urlPath: string; koray: number; cost: number; status: string }> = [];

  await processWithLimit(collections, CONCURRENCY, async (urlPath, _i) => {
    const label = `[${done + 1}/${total}] ${urlPath}`;
    let queueId: number | null = null;
    try {
      // Collect analytics (GSC only — GA4 falls back to empty if not configured)
      let gsc = emptyGsc;
      let ga4 = emptyGa4;
      try {
        const metrics = await collector.collectForPath(urlPath);
        gsc = metrics.gsc;
        ga4 = metrics.ga4;
      } catch {
        // Silently fall back to empty metrics
      }

      // Insert a real queue row so enrichment_log FK is satisfied
      queueId = await insertQueueRow(urlPath, gsc, ga4);
      const item = makeQueueItem(queueId, urlPath, gsc, ga4);

      // SERP is disabled by default (enableSerpAnalysis=false), skip unless configured
      const serpQueries = seoEnrichmentConfig.enableSerpAnalysis && gsc.topQueries.length > 0
        ? gsc.topQueries.slice(0, seoEnrichmentConfig.serpTopQueries).map((q) => q.query)
        : [];
      const serpAnalysis = await serp.analyzeQueries(serpQueries);

      const result = await engine.enrichQueueItem(item, serpAnalysis);
      if (!result) {
        throw new Error('Engine returned null — collection not found in DB');
      }

      await writer.write(item, result);
      await markQueueCompleted(queueId);

      const cost = result.usage.costUsd;
      totalCost += cost;
      succeeded++;

      const korayScore = result.koray.compliance.score;
      const appliedStr = seoEnrichmentConfig.mode === 'apply' && result.koray.compliance.passed ? 'applied' : seoEnrichmentConfig.mode;
      completedPages.push({ urlPath, koray: korayScore, cost, status: appliedStr });
      console.log(`  ✓ ${label} | koray=${korayScore} | $${cost.toFixed(4)} | ${appliedStr}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ urlPath, error: msg });
      console.error(`  ✗ ${label} | ${msg}`);
      if (queueId !== null) {
        await markQueueFailed(queueId, msg).catch(() => undefined);
      }
    } finally {
      done++;
    }
  });

  await serp.close();

  console.log(`\n=== Complete ===`);
  console.log(`Total:     ${total}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);

  if (errors.length > 0) {
    console.log(`\nFailed pages:`);
    for (const e of errors) {
      console.log(`  - ${e.urlPath}: ${e.error}`);
    }
  }

  // Write log file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `category-enrichment-${timestamp}.txt`);

  const logLines = [
    `Category Enrichment Run — ${new Date().toISOString()}`,
    `Mode: ${seoEnrichmentConfig.mode} | Concurrency: ${CONCURRENCY}`,
    `Total: ${total} | Succeeded: ${succeeded} | Failed: ${failed} | Cost: $${totalCost.toFixed(4)}`,
    ``,
    `Completed pages:`,
    ...completedPages.map((p) => `  ✓ ${p.urlPath.padEnd(55)} koray=${p.koray}  $${p.cost.toFixed(4)}  ${p.status}`),
  ];

  if (errors.length > 0) {
    logLines.push(``, `Failed pages:`);
    for (const e of errors) logLines.push(`  ✗ ${e.urlPath}: ${e.error}`);
  }

  fs.writeFileSync(logPath, logLines.join('\n'), 'utf-8');
  console.log(`\nLog saved → ${logPath}`);
}

main().catch((err) => {
  console.error('\n[enrich-all-categories] fatal:', err.message || err);
  process.exit(1);
});
