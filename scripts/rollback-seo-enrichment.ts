#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { rollbackByLogId, writeCollectionEnrichment, writeProductEnrichment } from '@/lib/seo-enrichment/db';
import { log } from '@/lib/seo-enrichment/logger';

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.split('=').slice(1).join('=');
}

async function main() {
  const logIdRaw = getArg('--log-id');
  if (!logIdRaw) {
    throw new Error('Missing required argument --log-id=<enrichment_log_id>');
  }
  const logId = Number.parseInt(logIdRaw, 10);
  if (!Number.isFinite(logId) || logId <= 0) {
    throw new Error(`Invalid --log-id value: ${logIdRaw}`);
  }

  const rollback = await rollbackByLogId(logId);
  if (!rollback) {
    throw new Error(`No enrichment_log row found for id ${logId}`);
  }

  if (rollback.pageType === 'product') {
    await writeProductEnrichment(rollback.pageIdentifier, {
      meta_title: String(rollback.beforeContent.meta_title || ''),
      meta_description: String(rollback.beforeContent.meta_description || ''),
      title_override: String(rollback.beforeContent.title_override || ''),
      description_html: String(rollback.beforeContent.description_html || ''),
      top_description_html: String(rollback.beforeContent.top_description_html || ''),
      bottom_description_html: String(rollback.beforeContent.bottom_description_html || ''),
      bullet_points: Array.isArray(rollback.beforeContent.bullet_points)
        ? (rollback.beforeContent.bullet_points as string[])
        : [],
    });
  } else {
    await writeCollectionEnrichment(rollback.pageIdentifier, {
      h1_title: String(rollback.beforeContent.h1_title || ''),
      meta_title: String(rollback.beforeContent.meta_title || ''),
      meta_description: String(rollback.beforeContent.meta_description || ''),
      short_description: String(rollback.beforeContent.short_description || ''),
      long_description: String(rollback.beforeContent.long_description || ''),
      faq_items: Array.isArray(rollback.beforeContent.faq_items) ? rollback.beforeContent.faq_items : [],
      related_categories: Array.isArray(rollback.beforeContent.related_categories)
        ? rollback.beforeContent.related_categories
        : [],
    });
  }

  log('info', 'Rollback applied', {
    logId,
    pageType: rollback.pageType,
    pageIdentifier: rollback.pageIdentifier,
  });
}

main().catch((error) => {
  console.error('[seo-enrichment rollback] failed:', error);
  process.exit(1);
});

