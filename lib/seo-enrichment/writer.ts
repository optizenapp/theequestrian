import { invalidateCache as invalidateCollectionCache } from '@/lib/content/collections';
import { invalidateProductOverrideCache } from '@/lib/content/product-overrides';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import {
  insertEnrichmentLog,
  writeCollectionEnrichment,
  writeInternalLinkSuggestions,
  writeProductCollectiveEnrichment,
  writeProductEnrichment,
  writeProductMetadataEnrichment,
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
    const complianceThreshold = seoEnrichmentConfig.metadataOnly
      ? seoEnrichmentConfig.collectiveAugment
        ? 72
        : 60
      : seoEnrichmentConfig.korayComplianceThreshold;
    const complianceGatePassed =
      result.koray.compliance.passed &&
      result.koray.compliance.score >= complianceThreshold;
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
        const productPayload = payload as EnrichmentResult['payload'] & {
          title_override: string;
          description_html: string;
          top_description_html: string;
          bottom_description_html: string;
          bullet_points: string[];
        };
        if (seoEnrichmentConfig.metadataOnly) {
          const collective = result.collective;
          const usesCollectiveWrite =
            collective != null &&
            (collective.use_headless_description ||
              collective.use_headless_top_description ||
              collective.use_headless_bottom_description ||
              seoEnrichmentConfig.normaliseDescription ||
              seoEnrichmentConfig.collectiveAugment);

          if (usesCollectiveWrite && collective) {
            await writeProductCollectiveEnrichment(result.pageIdentifier, {
              meta_title: productPayload.meta_title,
              meta_description: productPayload.meta_description,
              title_override: productPayload.title_override,
              bullet_points: productPayload.bullet_points,
              description_html: collective.description_html,
              top_description_html: collective.top_description_html,
              bottom_description_html: collective.bottom_description_html,
              use_headless_description: collective.use_headless_description,
              use_headless_top_description: collective.use_headless_top_description,
              use_headless_bottom_description: collective.use_headless_bottom_description,
            });
          } else {
            await writeProductMetadataEnrichment(result.pageIdentifier, {
              meta_title: productPayload.meta_title,
              meta_description: productPayload.meta_description,
              title_override: productPayload.title_override,
              bullet_points: productPayload.bullet_points,
            });
          }
        } else {
          await writeProductEnrichment(result.pageIdentifier, {
            meta_title: productPayload.meta_title,
            meta_description: productPayload.meta_description,
            title_override: productPayload.title_override,
            description_html: productPayload.description_html,
            top_description_html: productPayload.top_description_html,
            bottom_description_html: productPayload.bottom_description_html,
            bullet_points: productPayload.bullet_points,
          });
          const sourcePath = `/products/${result.pageIdentifier}`;
          await writeInternalLinkSuggestions(sourcePath, productPayload.internal_link_suggestions || []);
        }
      } else {
        const collectionPayload = payload as EnrichmentResult['payload'] & {
          h1_title: string;
          short_description: string;
          long_description: string;
          faq_items: Array<{ question: string; answer: string }>;
          related_categories: Array<{ url: string; title: string; description?: string }>;
        };
        await writeCollectionEnrichment(result.pageIdentifier, {
          h1_title: collectionPayload.h1_title,
          meta_title: collectionPayload.meta_title,
          meta_description: collectionPayload.meta_description,
          short_description: collectionPayload.short_description,
          long_description: collectionPayload.long_description,
          faq_items: collectionPayload.faq_items,
          related_categories: collectionPayload.related_categories,
        });
        await writeInternalLinkSuggestions(result.pageIdentifier, collectionPayload.internal_link_suggestions || []);
      }
      applied = true;
    }

    const afterContent = (() => {
      if (result.pageType === 'product') {
        const productPayload = payload as EnrichmentResult['payload'] & {
          title_override: string;
          description_html: string;
          top_description_html: string;
          bottom_description_html: string;
          bullet_points: string[];
        };
        if (seoEnrichmentConfig.metadataOnly) {
          const collective = result.collective;
          return collective
            ? {
                enrichment_mode: 'collective_metadata',
                meta_title: productPayload.meta_title,
                meta_description: productPayload.meta_description,
                title_override: productPayload.title_override,
                bullet_points: productPayload.bullet_points,
                description_html: collective.description_html,
                top_description_html: collective.top_description_html,
                bottom_description_html: collective.bottom_description_html,
                use_headless_description: collective.use_headless_description,
                use_headless_top_description: collective.use_headless_top_description,
                use_headless_bottom_description: collective.use_headless_bottom_description,
                normalisation_steps: collective.normalisation_steps,
              }
            : {
                enrichment_mode: 'metadata_only',
                meta_title: productPayload.meta_title,
                meta_description: productPayload.meta_description,
                title_override: productPayload.title_override,
                bullet_points: productPayload.bullet_points,
              };
        }
        return {
          meta_title: productPayload.meta_title,
          meta_description: productPayload.meta_description,
          title_override: productPayload.title_override,
          description_html: productPayload.description_html,
          top_description_html: productPayload.top_description_html,
          bottom_description_html: productPayload.bottom_description_html,
          bullet_points: productPayload.bullet_points,
        };
      }
      const collectionPayload = payload as EnrichmentResult['payload'] & {
        h1_title: string;
        short_description: string;
        long_description: string;
        faq_items: Array<{ question: string; answer: string }>;
        related_categories: Array<{ url: string; title: string; description?: string }>;
      };
      return {
        h1_title: collectionPayload.h1_title,
        meta_title: collectionPayload.meta_title,
        meta_description: collectionPayload.meta_description,
        short_description: collectionPayload.short_description,
        long_description: collectionPayload.long_description,
        faq_items: collectionPayload.faq_items,
        related_categories: collectionPayload.related_categories,
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

