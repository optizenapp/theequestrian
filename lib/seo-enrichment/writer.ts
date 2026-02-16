import { invalidateCache as invalidateCollectionCache } from '@/lib/content/collections';
import { invalidateProductOverrideCache } from '@/lib/content/product-overrides';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import {
  insertEnrichmentLog,
  writeCollectionEnrichment,
  writeInternalLinkSuggestions,
  writeProductEnrichment,
} from '@/lib/seo-enrichment/db';
import { log } from '@/lib/seo-enrichment/logger';
import type { EnrichmentResult, QueueItem } from '@/lib/seo-enrichment/types';

function getRevalidateEndpoint(): string | null {
  if (!seoEnrichmentConfig.revalidateBaseUrl) return null;
  const base = seoEnrichmentConfig.revalidateBaseUrl.replace(/\/$/, '');
  const path = seoEnrichmentConfig.revalidateUrlPath.startsWith('/')
    ? seoEnrichmentConfig.revalidateUrlPath
    : `/${seoEnrichmentConfig.revalidateUrlPath}`;
  return `${base}${path}`;
}

async function revalidateItem(result: EnrichmentResult): Promise<void> {
  const endpoint = getRevalidateEndpoint();
  if (!endpoint || !seoEnrichmentConfig.revalidateSecret) {
    log('warn', 'Skipping revalidate call; missing endpoint or secret');
    return;
  }

  const body =
    result.pageType === 'product'
      ? {
          productHandle: result.pageIdentifier,
          paths: [result.canonicalPath],
        }
      : {
          paths: [result.pageIdentifier],
          tags: ['search', `collection-${result.pageIdentifier}`],
        };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': seoEnrichmentConfig.revalidateSecret,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const preview = await response.text();
      log('warn', 'Revalidate request failed', { status: response.status, preview: preview.slice(0, 250) });
    }
  } catch (error) {
    log('warn', 'Revalidate request error', { error: String(error) });
  }
}

export class EnrichmentWriter {
  async write(queueItem: QueueItem, result: EnrichmentResult): Promise<number> {
    const complianceGatePassed =
      result.koray.compliance.passed &&
      result.koray.compliance.score >= seoEnrichmentConfig.korayComplianceThreshold;
    const shouldApply = seoEnrichmentConfig.mode === 'apply' && complianceGatePassed;
    const isShadow = seoEnrichmentConfig.mode === 'shadow';
    const payload = result.payload;
    let applied = false;

    if (seoEnrichmentConfig.mode === 'apply' && !complianceGatePassed) {
      log('warn', 'Apply mode blocked by Koray compliance gate', {
        pageType: result.pageType,
        pageIdentifier: result.pageIdentifier,
        score: result.koray.compliance.score,
        threshold: seoEnrichmentConfig.korayComplianceThreshold,
      });
    }

    if (shouldApply) {
      if (result.pageType === 'product') {
        await writeProductEnrichment(result.pageIdentifier, {
          meta_title: payload.meta_title,
          meta_description: payload.meta_description,
          title_override: payload.title_override,
          description_html: payload.description_html,
          top_description_html: payload.top_description_html,
          bottom_description_html: payload.bottom_description_html,
          bullet_points: payload.bullet_points,
        });
        const sourcePath = `/products/${result.pageIdentifier}`;
        await writeInternalLinkSuggestions(sourcePath, payload.internal_link_suggestions || []);
      } else {
        await writeCollectionEnrichment(result.pageIdentifier, {
          h1_title: payload.h1_title,
          meta_title: payload.meta_title,
          meta_description: payload.meta_description,
          short_description: payload.short_description,
          long_description: payload.long_description,
          faq_items: payload.faq_items,
          related_categories: payload.related_categories,
        });
        await writeInternalLinkSuggestions(result.pageIdentifier, payload.internal_link_suggestions || []);
      }
      applied = true;
    }

    const afterContent = (() => {
      if (result.pageType === 'product') {
        return {
          meta_title: payload.meta_title,
          meta_description: payload.meta_description,
          title_override: payload.title_override,
          description_html: payload.description_html,
          top_description_html: payload.top_description_html,
          bottom_description_html: payload.bottom_description_html,
          bullet_points: payload.bullet_points,
        };
      }
      return {
        h1_title: payload.h1_title,
        meta_title: payload.meta_title,
        meta_description: payload.meta_description,
        short_description: payload.short_description,
        long_description: payload.long_description,
        faq_items: payload.faq_items,
        related_categories: payload.related_categories,
      };
    })();

    const logId = await insertEnrichmentLog({
      queueId: queueItem.id,
      pageType: result.pageType,
      pageIdentifier: result.pageIdentifier,
      canonicalPath: result.canonicalPath,
      beforeContent: result.beforeContent,
      afterContent,
      gscData: queueItem.gsc_data,
      ga4Data: queueItem.ga4_data,
      serpAnalysis: result.serpAnalysis,
      reasoning: payload.reasoning,
      modelUsed: result.usage.model,
      korayFrameworkVersion: result.koray.frameworkVersion,
      korayRuleIdsUsed: result.koray.ruleIdsUsed,
      promptTokens: result.usage.inputTokens,
      completionTokens: result.usage.outputTokens,
      totalCostUsd: result.usage.costUsd,
      beforeScores: queueItem.priority_reasons || {},
      afterScores: {
        korayCompliance: result.koray.compliance,
        korayIntent: result.koray.intent,
      },
      applied,
    });

    if (shouldApply) {
      invalidateCollectionCache();
      invalidateProductOverrideCache();
      await revalidateItem(result);
    }

    if (isShadow) {
      log('info', 'Shadow mode: logged enrichment without applying content updates', {
        pageType: result.pageType,
        pageIdentifier: result.pageIdentifier,
      });
    }
    return logId;
  }
}

