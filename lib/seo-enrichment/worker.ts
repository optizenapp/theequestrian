import { assertSeoEnrichmentEnvForApply, seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import { AnalyticsCollector } from '@/lib/seo-enrichment/collector';
import { EnrichmentEngine } from '@/lib/seo-enrichment/engine';
import {
  claimQueueBatch,
  createSingleHandleQueueItem,
  markQueueCompleted,
  markQueueFailed,
  requeueFailed,
  resolveProductCanonicalPath,
} from '@/lib/seo-enrichment/db';
import { log } from '@/lib/seo-enrichment/logger';
import { EnrichmentSelector } from '@/lib/seo-enrichment/selector';
import { SerpAnalyzer } from '@/lib/seo-enrichment/serp';
import { EnrichmentWriter } from '@/lib/seo-enrichment/writer';
import type { QueueItem } from '@/lib/seo-enrichment/types';

export class SeoEnrichmentWorker {
  private readonly collector = new AnalyticsCollector();
  private readonly selector = new EnrichmentSelector(this.collector);
  private readonly serp = new SerpAnalyzer();
  private readonly engine = new EnrichmentEngine();
  private readonly writer = new EnrichmentWriter();
  private shutdownRequested = false;

  constructor() {
    this.engine.reportMissingKeyWarning();
    // Cleanup on process exit
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async shutdown() {
    if (this.shutdownRequested) return;
    this.shutdownRequested = true;
    log('info', 'Shutting down SEO enrichment worker...');
    await this.serp.close();
    process.exit(0);
  }

  async runSelection() {
    assertSeoEnrichmentEnvForApply();
    const count = await this.selector.runSelection();
    await requeueFailed(seoEnrichmentConfig.requeueFailedRetries);
    return count;
  }

  async runOnce() {
    assertSeoEnrichmentEnvForApply();
    const claimed = await claimQueueBatch(seoEnrichmentConfig.queuePollLimit);
    if (claimed.length === 0) {
      log('info', 'No queue items available');
      return 0;
    }
    await this.processBatch(claimed);
    return claimed.length;
  }

  async runLoop() {
    assertSeoEnrichmentEnvForApply();
    process.on('SIGINT', () => {
      this.shutdownRequested = true;
      log('warn', 'SIGINT received, shutting down queue loop');
    });
    process.on('SIGTERM', () => {
      this.shutdownRequested = true;
      log('warn', 'SIGTERM received, shutting down queue loop');
    });

    while (!this.shutdownRequested) {
      const claimed = await claimQueueBatch(seoEnrichmentConfig.maxConcurrentJobs);
      if (claimed.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, seoEnrichmentConfig.claimSleepMs));
        continue;
      }
      await this.processBatch(claimed);
    }
  }

  async retryFailed() {
    assertSeoEnrichmentEnvForApply();
    const retried = await requeueFailed(seoEnrichmentConfig.requeueFailedRetries);
    log('info', 'Requeued failed items', { count: retried });
    return retried;
  }

  /** Process one product handle directly (skips selection). */
  async processHandle(handle: string): Promise<number> {
    assertSeoEnrichmentEnvForApply();
    const trimmed = handle.trim();
    if (!trimmed) throw new Error('Handle is required');
    const item = await createSingleHandleQueueItem(trimmed);
    await this.processItem(item);
    return 1;
  }

  private async processBatch(items: QueueItem[]) {
    const tasks = items.map((item) => this.processItem(item));
    await Promise.all(tasks);
  }

  private async processItem(item: QueueItem) {
    try {
      let canonicalPath = item.canonical_path;
      if (item.page_type === 'product' && (!canonicalPath || canonicalPath === `/products/${item.page_identifier}`)) {
        canonicalPath = await resolveProductCanonicalPath(item.page_identifier);
      }
      const topQueries = (item.gsc_data.topQueries || [])
        .slice(0, seoEnrichmentConfig.serpTopQueries)
        .map((q) => q.query)
        .filter((query) => Boolean(query && query.trim()));
      const fallbackQuery =
        seoEnrichmentConfig.enableSerpAnalysis && topQueries.length === 0
          ? item.page_identifier.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
          : '';
      const serpQueries = topQueries.length > 0 ? topQueries : fallbackQuery ? [fallbackQuery] : [];
      if (fallbackQuery) {
        log('info', 'Using fallback SERP query', {
          pageType: item.page_type,
          pageIdentifier: item.page_identifier,
          query: fallbackQuery,
        });
      }
      const serpAnalysis = await this.serp.analyzeQueries(serpQueries);
      const normalizedItem = { ...item, canonical_path: canonicalPath };
      const result = await this.engine.enrichQueueItem(normalizedItem, serpAnalysis);
      if (!result) {
        await markQueueFailed(item.id, 'No enrichment result generated');
        return;
      }
      const logId = await this.writer.write(normalizedItem, result);
      await markQueueCompleted(item.id);
      log('info', 'Queue item processed', {
        queueId: item.id,
        pageType: item.page_type,
        pageIdentifier: item.page_identifier,
        logId,
        mode: seoEnrichmentConfig.mode,
      });
    } catch (error) {
      await markQueueFailed(item.id, String(error));
      log('error', 'Queue item failed', {
        queueId: item.id,
        pageType: item.page_type,
        pageIdentifier: item.page_identifier,
        error: String(error),
      });
    }
  }
}

