import { sql } from '@vercel/postgres';
import { EnrichmentQueries } from '@/lib/seo-enrichment/queries';
import type {
  EnrichmentPageType,
  GscMetrics,
  Ga4Metrics,
  InternalLinkSuggestion,
  QueueItem,
  QueuePageCandidate,
  QueuePageWithMetrics,
} from '@/lib/seo-enrichment/types';

function asJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

export type EligiblePagesOptions = {
  vendor?: string;
  brand?: string;
  metadataOnly?: boolean;
  productsOnly?: boolean;
};

export async function getEligiblePages(
  intervalDays: number,
  options: EligiblePagesOptions = {}
): Promise<QueuePageCandidate[]> {
  const vendor = options.vendor?.trim() || '';
  const brand = options.brand?.trim() || '';
  const metadataOnly = options.metadataOnly ?? false;
  const productsOnly = options.productsOnly ?? Boolean(vendor);

  const params: unknown[] = [String(intervalDays)];
  const vendorClause = vendor
    ? (() => {
        params.push(vendor);
        const vendorParam = `$${params.length}`;
        const vendorLike = `${vendor.trim().split(/\s+/)[0]?.toLowerCase() || vendor.trim().toLowerCase()}%`;
        params.push(vendorLike);
        const vendorLikeParam = `$${params.length}`;
        return `AND (
          LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendorParam}))
          OR LOWER(TRIM(p.vendor)) LIKE ${vendorLikeParam}
        )`;
      })()
    : '';
  const brandClause = brand
    ? (() => {
        params.push(brand);
        const brandParam = `$${params.length}`;
        const handlePrefix = `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-%`;
        params.push(handlePrefix);
        const prefixParam = `$${params.length}`;
        return `AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brandParam})) OR LOWER(p.handle) LIKE ${prefixParam})`;
      })()
    : '';
  const metadataClause = metadataOnly
    ? `AND (
        co.product_handle IS NULL
        OR COALESCE(co.use_headless_meta_title, FALSE) IS NOT TRUE
        OR COALESCE(co.use_headless_meta_description, FALSE) IS NOT TRUE
        OR COALESCE(co.use_headless_title, FALSE) IS NOT TRUE
        OR COALESCE(co.use_headless_bullets, FALSE) IS NOT TRUE
      )`
    : '';

  const collectionPagesCte = productsOnly
    ? ''
    : `,
    collection_pages AS (
      SELECT
        'collection'::text AS page_type,
        cc.url_path AS page_identifier,
        cc.url_path AS canonical_path,
        (
          SELECT MAX(el.created_at)
          FROM enrichment_log el
          WHERE el.page_type = 'collection'
            AND el.page_identifier = cc.url_path
            AND el.applied = TRUE
        ) AS last_enriched_at,
        (cc.status = 'published') AS is_active
      FROM collection_content cc
    )`;

  const allPagesSource = productsOnly
    ? `SELECT * FROM product_pages`
    : `SELECT * FROM product_pages UNION ALL SELECT * FROM collection_pages`;

  const skipRecentlyEnriched = Boolean(vendor);
  const skipActiveCheck = Boolean(vendor);

  const text = `
    WITH product_pages AS (
      SELECT
        'product'::text AS page_type,
        p.handle AS page_identifier,
        COALESCE(pca.canonical_path, '/products/' || p.handle) AS canonical_path,
        co.updated_at AS last_enriched_at,
        (p.available_for_sale IS NOT FALSE) AS is_active
      FROM products p
      LEFT JOIN product_content_overrides co
        ON co.product_handle = p.handle
      LEFT JOIN product_category_assignments pca
        ON pca.product_handle = p.handle
      WHERE 1=1
        ${vendorClause}
        ${brandClause}
        ${metadataClause}
    )${collectionPagesCte},
    all_pages AS (
      ${allPagesSource}
    ),
    recently_enriched AS (
      SELECT DISTINCT page_type, page_identifier
      FROM enrichment_log
      WHERE created_at > NOW() - ($1::text || ' days')::interval
        AND applied = TRUE
    )
    SELECT
      ap.page_type,
      ap.page_identifier,
      ap.canonical_path,
      ap.last_enriched_at
    FROM all_pages ap
    LEFT JOIN recently_enriched re
      ON re.page_type = ap.page_type
     AND re.page_identifier = ap.page_identifier
    WHERE ${skipActiveCheck ? 'TRUE' : 'ap.is_active = TRUE'}
      ${skipRecentlyEnriched ? '' : 'AND re.page_identifier IS NULL'}
    ORDER BY ap.last_enriched_at ASC NULLS FIRST
  `;

  const result = await sql.query(text, params);
  return result.rows.map((row) => ({
    pageType: row.page_type as EnrichmentPageType,
    pageIdentifier: row.page_identifier as string,
    canonicalPath: row.canonical_path as string,
    lastEnrichedAt: row.last_enriched_at ? String(row.last_enriched_at) : null,
  }));
}

export async function enqueuePages(pages: QueuePageWithMetrics[]): Promise<void> {
  for (const page of pages) {
    await sql.query(EnrichmentQueries.enqueuePage, [
      page.pageType,
      page.pageIdentifier,
      page.canonicalPath,
      page.priorityScore,
      asJson(page.priorityReasons),
      asJson(page.gscData),
      asJson(page.ga4Data),
    ]);
  }
}

export async function claimQueueBatch(limit: number): Promise<QueueItem[]> {
  const result = await sql.query(EnrichmentQueries.claimBatch, [limit]);
  return result.rows.map((row) => ({
    ...row,
    gsc_data: typeof row.gsc_data === 'string' ? JSON.parse(row.gsc_data) : row.gsc_data,
    ga4_data: typeof row.ga4_data === 'string' ? JSON.parse(row.ga4_data) : row.ga4_data,
    priority_reasons:
      typeof row.priority_reasons === 'string' ? JSON.parse(row.priority_reasons) : row.priority_reasons,
  })) as QueueItem[];
}

export async function markQueueCompleted(id: number): Promise<void> {
  await sql.query(EnrichmentQueries.markQueueCompleted, [id]);
}

export async function markQueueFailed(id: number, error: string): Promise<void> {
  await sql.query(EnrichmentQueries.markQueueFailed, [id, error.slice(0, 500)]);
}

export async function requeueFailed(maxRetries: number): Promise<void> {
  await sql.query(EnrichmentQueries.requeueFailed, [maxRetries]);
}

export async function createSingleHandleQueueItem(handle: string): Promise<QueueItem> {
  const trimmed = handle.trim();
  const canonicalPath = await resolveProductCanonicalPath(trimmed);
  const gscData: GscMetrics = {
    totalImpressions: 0,
    totalClicks: 0,
    avgPosition: 0,
    avgCtr: 0,
    topQueries: [],
    highImpressionLowPosition: [],
    highImpressionLowCtr: [],
  };
  const ga4Data: Ga4Metrics = {
    sessions: 0,
    revenue: 0,
    conversions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    addToCarts: 0,
    transactions: 0,
  };
  const priorityReasons = { single_handle_test: true };

  const inserted = await sql.query(EnrichmentQueries.enqueuePage, [
    'product',
    trimmed,
    canonicalPath,
    100,
    asJson(priorityReasons),
    asJson(gscData),
    asJson(ga4Data),
  ]);

  const queueId = Number(inserted.rows[0]?.id);
  if (!Number.isFinite(queueId)) {
    throw new Error(`Failed to enqueue handle: ${trimmed}`);
  }

  await sql.query(
    `UPDATE enrichment_queue SET status = 'processing', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [queueId]
  );

  return {
    id: queueId,
    page_type: 'product',
    page_identifier: trimmed,
    canonical_path: canonicalPath,
    priority_score: 100,
    priority_reasons: priorityReasons,
    gsc_data: gscData,
    ga4_data: ga4Data,
  };
}

export async function fetchProductForEnrichment(handle: string) {
  const result = await sql.query(EnrichmentQueries.productDataForEnrichment, [handle]);
  return result.rows[0] || null;
}

export async function fetchCollectionForEnrichment(urlPath: string) {
  const result = await sql.query(EnrichmentQueries.collectionDataForEnrichment, [urlPath]);
  return result.rows[0] || null;
}

export async function writeProductEnrichment(
  handle: string,
  payload: {
    meta_title: string;
    meta_description: string;
    title_override: string;
    description_html: string;
    top_description_html: string;
    bottom_description_html: string;
    bullet_points: string[];
  }
): Promise<void> {
  await sql.query(EnrichmentQueries.upsertProductOverride, [
    handle,
    payload.meta_title,
    payload.meta_description,
    payload.title_override,
    payload.description_html,
    payload.top_description_html,
    payload.bottom_description_html,
    JSON.stringify(payload.bullet_points || []),
  ]);
}

export async function writeProductMetadataEnrichment(
  handle: string,
  payload: {
    meta_title: string;
    meta_description: string;
    title_override: string;
    bullet_points: string[];
  }
): Promise<void> {
  await sql.query(EnrichmentQueries.upsertProductMetadataOverride, [
    handle,
    payload.meta_title,
    payload.meta_description,
    payload.title_override,
    JSON.stringify(payload.bullet_points || []),
  ]);
}

export async function writeProductCollectiveEnrichment(
  handle: string,
  payload: {
    meta_title: string;
    meta_description: string;
    title_override: string;
    bullet_points: string[];
    description_html: string;
    top_description_html: string;
    bottom_description_html: string;
    use_headless_description: boolean;
    use_headless_top_description: boolean;
    use_headless_bottom_description: boolean;
  }
): Promise<void> {
  await sql.query(EnrichmentQueries.upsertProductCollectiveOverride, [
    handle,
    payload.meta_title,
    payload.meta_description,
    payload.title_override,
    JSON.stringify(payload.bullet_points || []),
    payload.description_html,
    payload.top_description_html,
    payload.bottom_description_html,
    payload.use_headless_description,
    payload.use_headless_top_description,
    payload.use_headless_bottom_description,
  ]);
}

export async function writeCollectionEnrichment(
  urlPath: string,
  payload: {
    h1_title: string;
    meta_title: string;
    meta_description: string;
    short_description: string;
    long_description: string;
    faq_items: unknown[];
    related_categories: unknown[];
  }
): Promise<void> {
  await sql.query(EnrichmentQueries.updateCollectionContent, [
    urlPath,
    payload.h1_title,
    payload.meta_title,
    payload.meta_description,
    payload.short_description,
    payload.long_description,
    JSON.stringify(payload.faq_items || []),
    JSON.stringify(payload.related_categories || []),
  ]);
}

export async function writeInternalLinkSuggestions(
  sourcePath: string,
  suggestions: InternalLinkSuggestion[]
): Promise<void> {
  for (const suggestion of suggestions || []) {
    if (!suggestion?.target_path) continue;
    await sql.query(EnrichmentQueries.upsertInternalLinkSuggestion, [
      sourcePath,
      suggestion.target_path,
      suggestion.anchor_text || '',
      suggestion.context || '',
      suggestion.link_type || 'contextual',
    ]);
  }
}

export async function insertEnrichmentLog(input: {
  queueId: number;
  pageType: EnrichmentPageType;
  pageIdentifier: string;
  canonicalPath: string;
  beforeContent: Record<string, unknown>;
  afterContent: Record<string, unknown>;
  gscData: GscMetrics;
  ga4Data: Ga4Metrics;
  serpAnalysis: Record<string, unknown>;
  reasoning?: string;
  modelUsed: string;
  korayFrameworkVersion?: string;
  korayRuleIdsUsed?: string[];
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  beforeScores?: Record<string, unknown>;
  afterScores?: Record<string, unknown>;
  applied: boolean;
}): Promise<number> {
  const result = await sql.query(EnrichmentQueries.insertEnrichmentLog, [
    input.queueId,
    input.pageType,
    input.pageIdentifier,
    input.canonicalPath,
    asJson(input.beforeContent),
    asJson(input.afterContent),
    asJson(input.gscData),
    asJson(input.ga4Data),
    asJson(input.serpAnalysis),
    input.reasoning || '',
    input.modelUsed,
    input.promptTokens,
    input.completionTokens,
    input.totalCostUsd,
    input.korayFrameworkVersion || null,
    asJson(input.korayRuleIdsUsed || []),
    asJson(input.beforeScores || {}),
    asJson(input.afterScores || {}),
    input.applied,
  ]);

  return Number(result.rows[0]?.id || 0);
}

export async function rollbackByLogId(logId: number): Promise<{
  pageType: EnrichmentPageType;
  pageIdentifier: string;
  beforeContent: Record<string, unknown>;
} | null> {
  const result = await sql.query(EnrichmentQueries.rollbackByLogId, [logId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    pageType: row.page_type as EnrichmentPageType,
    pageIdentifier: row.page_identifier as string,
    beforeContent:
      typeof row.before_content === 'string'
        ? JSON.parse(row.before_content)
        : (row.before_content as Record<string, unknown>),
  };
}

export async function writePageMetricsHistory(input: {
  pageType: EnrichmentPageType;
  pageIdentifier: string;
  canonicalPath: string;
  gscData: GscMetrics;
  ga4Data: Ga4Metrics;
  periodStart: string;
  periodEnd: string;
}) {
  await sql.query(EnrichmentQueries.insertPageMetricsHistory, [
    input.pageType,
    input.pageIdentifier,
    input.canonicalPath,
    input.gscData.totalImpressions,
    input.gscData.totalClicks,
    input.gscData.avgPosition,
    input.gscData.avgCtr,
    JSON.stringify(input.gscData.topQueries || []),
    JSON.stringify(input.gscData.highImpressionLowPosition || []),
    JSON.stringify(input.gscData.highImpressionLowCtr || []),
    input.ga4Data.sessions,
    input.ga4Data.revenue,
    input.ga4Data.conversions,
    input.ga4Data.bounceRate,
    input.ga4Data.avgSessionDuration,
    input.ga4Data.addToCarts,
    input.ga4Data.transactions,
    input.periodStart,
    input.periodEnd,
  ]);
}

export async function getSerpCache(query: string): Promise<{ results: unknown[]; analysis: Record<string, unknown> } | null> {
  const result = await sql.query(EnrichmentQueries.getSerpCache, [query]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results,
    analysis: typeof row.analysis === 'string' ? JSON.parse(row.analysis) : row.analysis,
  };
}

export async function upsertSerpCache(query: string, results: unknown[], analysis: Record<string, unknown>) {
  await sql.query(EnrichmentQueries.upsertSerpCache, [query, JSON.stringify(results), JSON.stringify(analysis)]);
}

export async function resolveProductCanonicalPath(handle: string): Promise<string> {
  const row = await sql`
    SELECT canonical_path
    FROM product_category_assignments
    WHERE product_handle = ${handle}
    LIMIT 1
  `;
  return row.rows[0]?.canonical_path || `/products/${handle}`;
}

