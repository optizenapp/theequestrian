import type { EnrichmentMode } from '@/lib/seo-enrichment/types';

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const seoEnrichmentConfig = {
  mode: ((process.env.SEO_ENRICHMENT_MODE || 'dry-run') as EnrichmentMode),
  dailyBatchSize: toInt(process.env.SEO_ENRICHMENT_DAILY_BATCH_SIZE, 120),
  selectionCandidateMultiplier: toInt(process.env.SEO_ENRICHMENT_SELECTION_CANDIDATE_MULTIPLIER, 4),
  selectionHardCap: toInt(process.env.SEO_ENRICHMENT_SELECTION_HARD_CAP, 600),
  minBatchSize: toInt(process.env.SEO_ENRICHMENT_MIN_BATCH_SIZE, 25),
  maxBatchSize: toInt(process.env.SEO_ENRICHMENT_MAX_BATCH_SIZE, 300),
  enrichmentIntervalDays: toInt(process.env.SEO_ENRICHMENT_INTERVAL_DAYS, 30),
  lookbackDays: toInt(process.env.SEO_ENRICHMENT_LOOKBACK_DAYS, 30),
  maxConcurrentJobs: toInt(process.env.SEO_ENRICHMENT_MAX_CONCURRENCY, 4),
  claimSleepMs: toInt(process.env.SEO_ENRICHMENT_EMPTY_SLEEP_MS, 30000),
  queuePollLimit: toInt(process.env.SEO_ENRICHMENT_QUEUE_POLL_LIMIT, 4),
  requeueFailedRetries: toInt(process.env.SEO_ENRICHMENT_MAX_RETRIES, 3),
  enableSerpAnalysis: toBool(process.env.SEO_ENRICHMENT_ENABLE_SERP, false),
  serpTopQueries: toInt(process.env.SEO_ENRICHMENT_SERP_TOP_QUERIES, 3),
  serpResultsToUse: toInt(process.env.SEO_ENRICHMENT_SERP_RESULTS_TO_USE, 5),
  gscSiteUrl: process.env.GSC_SITE_URL || '',
  gscServiceAccountJson: process.env.GSC_SERVICE_ACCOUNT_JSON || '',
  ga4ServiceAccountJson: process.env.GA4_SERVICE_ACCOUNT_JSON || '',
  ga4PropertyId: process.env.GA4_PROPERTY_ID || '',
  serpApiKey: process.env.VALUESERP_API_KEY || process.env.SERPAPI_API_KEY || '',
  openaiModel: process.env.SEO_ENRICHMENT_MODEL || 'gpt-4o',
  openaiMaxTokens: toInt(process.env.SEO_ENRICHMENT_MAX_TOKENS, 3000),
  korayComplianceThreshold: toInt(process.env.SEO_ENRICHMENT_KORAY_COMPLIANCE_THRESHOLD, 72),
  maxRegenerationAttempts: toInt(process.env.SEO_ENRICHMENT_MAX_REGEN_ATTEMPTS, 1),
  inputCostPer1k: toFloat(process.env.SEO_ENRICHMENT_INPUT_COST_PER_1K, 0.005),
  outputCostPer1k: toFloat(process.env.SEO_ENRICHMENT_OUTPUT_COST_PER_1K, 0.015),
  revalidateUrlPath: process.env.SEO_ENRICHMENT_REVALIDATE_PATH || '/api/internal/revalidate-shopify',
  revalidateSecret: process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET || '',
  revalidateBaseUrl: process.env.SEO_ENRICHMENT_REVALIDATE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '',
  writeMetricsHistory: toBool(process.env.SEO_ENRICHMENT_WRITE_METRICS_HISTORY, true),
  logVerbose: toBool(process.env.SEO_ENRICHMENT_VERBOSE, false),
  // Minimum collection pages guaranteed per daily batch (front-loads categories each cycle)
  collectionMinSlots: toInt(process.env.SEO_ENRICHMENT_COLLECTION_MIN_SLOTS, 30),
} as const;

export function assertSeoEnrichmentEnvForApply() {
  if (seoEnrichmentConfig.mode === 'apply' || seoEnrichmentConfig.mode === 'shadow') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for SEO enrichment in shadow/apply mode.');
    }
  }
}

