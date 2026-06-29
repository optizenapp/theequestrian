import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import { AnalyticsCollector } from '@/lib/seo-enrichment/collector';
import { enqueuePages, getEligiblePages, writePageMetricsHistory } from '@/lib/seo-enrichment/db';
import { log } from '@/lib/seo-enrichment/logger';
import type { QueuePageCandidate, QueuePageWithMetrics } from '@/lib/seo-enrichment/types';

function scorePage(page: QueuePageWithMetrics): QueuePageWithMetrics {
  const reasons: Record<string, unknown> = {};
  let score = 0;
  const gsc = page.gscData;
  const ga4 = page.ga4Data;

  if (!page.lastEnrichedAt) {
    score += 50;
    reasons.never_enriched = true;
  }

  if (gsc.highImpressionLowPosition.length > 0) {
    score += 30 * Math.min(gsc.highImpressionLowPosition.length, 5) / 5;
    reasons.quick_win_queries = gsc.highImpressionLowPosition.length;
  }

  if (gsc.highImpressionLowCtr.length > 0) {
    score += 20 * Math.min(gsc.highImpressionLowCtr.length, 5) / 5;
    reasons.low_ctr_queries = gsc.highImpressionLowCtr.length;
  }

  if (ga4.revenue > 0) {
    score += Math.min(ga4.revenue / 100, 20);
    reasons.revenue = ga4.revenue;
  }

  if (gsc.totalImpressions > 0) {
    score += Math.min(gsc.totalImpressions / 1000, 15);
    reasons.impressions = gsc.totalImpressions;
  }

  if (page.lastEnrichedAt) {
    const staleDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(page.lastEnrichedAt).getTime()) / (24 * 60 * 60 * 1000))
    );
    score += Math.min(staleDays / 30, 10);
    reasons.days_since_enrichment = staleDays;
  }

  if (page.pageType === 'collection') {
    score += 5;
    reasons.collection_boost = true;
  }

  if (gsc.avgPosition > 0 && gsc.avgPosition < 5 && gsc.avgCtr > 0.05 && gsc.highImpressionLowCtr.length === 0) {
    score = Math.min(score, 1);
    reasons.already_performing_well = true;
  }

  if (gsc.topQueries.length === 0) {
    score += 15;
    reasons.no_search_data = true;
  }

  return {
    ...page,
    priorityScore: Number(score.toFixed(2)),
    priorityReasons: reasons,
  };
}

function getDynamicBatchSize(totalEligible: number): number {
  const effectiveDays = Math.max(seoEnrichmentConfig.enrichmentIntervalDays - 3, 7);
  const calculated = Math.ceil(totalEligible / effectiveDays);
  return Math.max(
    seoEnrichmentConfig.minBatchSize,
    Math.min(calculated, seoEnrichmentConfig.maxBatchSize, seoEnrichmentConfig.dailyBatchSize)
  );
}

function lookbackPeriod() {
  const end = new Date();
  const start = new Date(end.getTime() - seoEnrichmentConfig.lookbackDays * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export class EnrichmentSelector {
  constructor(private readonly collector: AnalyticsCollector) {}

  async runSelection(): Promise<number> {
    const eligiblePages = await getEligiblePages(seoEnrichmentConfig.enrichmentIntervalDays, {
      vendor: seoEnrichmentConfig.vendorFilter || undefined,
      brand: seoEnrichmentConfig.brandFilter || undefined,
      metadataOnly: seoEnrichmentConfig.metadataOnly,
      productsOnly: seoEnrichmentConfig.productsOnly,
    });
    if (eligiblePages.length === 0) {
      log('info', 'No eligible pages for enrichment selection', {
        vendor: seoEnrichmentConfig.vendorFilter || 'all',
        brand: seoEnrichmentConfig.brandFilter || 'all',
        metadataOnly: seoEnrichmentConfig.metadataOnly,
      });
      return 0;
    }

    const batchSize = getDynamicBatchSize(eligiblePages.length);
    const candidateLimit = Math.min(
      eligiblePages.length,
      Math.max(batchSize * seoEnrichmentConfig.selectionCandidateMultiplier, batchSize),
      seoEnrichmentConfig.selectionHardCap
    );
    const selectionPool = eligiblePages.slice(0, candidateLimit);
    log('info', 'Selecting daily enrichment batch', {
      eligiblePages: eligiblePages.length,
      batchSize,
      candidateLimit,
      vendor: seoEnrichmentConfig.vendorFilter || 'all',
      metadataOnly: seoEnrichmentConfig.metadataOnly,
      productsOnly: seoEnrichmentConfig.productsOnly,
    });

    const withMetrics: QueuePageWithMetrics[] = [];
    const period = lookbackPeriod();

    for (const page of selectionPool) {
      let metrics;
      try {
        metrics = await this.collector.collectForPath(page.canonicalPath);
      } catch (error) {
        // Analytics collection failed, use empty metrics
        log('warn', 'Analytics collection failed, using empty metrics', {
          path: page.canonicalPath,
          error: error instanceof Error ? error.message : String(error),
        });
        metrics = {
          gsc: { totalClicks: 0, totalImpressions: 0, avgPosition: 0, avgCtr: 0, topQueries: [], highImpressionLowPosition: [], highImpressionLowCtr: [] },
          ga4: { sessions: 0, bounceRate: 0, avgSessionDuration: 0, conversions: 0, transactions: 0, revenue: 0, addToCarts: 0 },
        };
      }
      
      const candidate: QueuePageWithMetrics = {
        ...page,
        gscData: metrics.gsc,
        ga4Data: metrics.ga4,
        priorityScore: 0,
        priorityReasons: {},
      };
      const scored = scorePage(candidate);
      withMetrics.push(scored);

      if (seoEnrichmentConfig.writeMetricsHistory && metrics.gsc.totalImpressions > 0) {
        await writePageMetricsHistory({
          pageType: page.pageType,
          pageIdentifier: page.pageIdentifier,
          canonicalPath: page.canonicalPath,
          gscData: metrics.gsc,
          ga4Data: metrics.ga4,
          periodStart: period.start,
          periodEnd: period.end,
        });
      }
    }

    withMetrics.sort((a, b) => b.priorityScore - a.priorityScore);

    // Reserve guaranteed slots for collection pages (skipped in products-only / vendor mode)
    const minCollectionSlots = seoEnrichmentConfig.productsOnly
      ? 0
      : Math.min(seoEnrichmentConfig.collectionMinSlots, batchSize);
    const collections = withMetrics.filter((p) => p.pageType === 'collection');
    const nonCollections = withMetrics.filter((p) => p.pageType !== 'collection');
    const reservedCollections = collections.slice(0, minCollectionSlots);
    const remainingSlots = Math.max(0, batchSize - reservedCollections.length);
    const finalBatch = [...reservedCollections, ...nonCollections.slice(0, remainingSlots)];

    log('info', 'Enrichment batch composition', {
      collections: reservedCollections.length,
      products: finalBatch.length - reservedCollections.length,
      total: finalBatch.length,
    });

    await enqueuePages(finalBatch);
    log('info', 'Enrichment pages enqueued', { count: finalBatch.length });
    return finalBatch.length;
  }

  async prepareSinglePage(page: QueuePageCandidate): Promise<QueuePageWithMetrics> {
    const { gsc, ga4 } = await this.collector.collectForPath(page.canonicalPath);
    return scorePage({
      ...page,
      gscData: gsc,
      ga4Data: ga4,
      priorityScore: 0,
      priorityReasons: {},
    });
  }
}

