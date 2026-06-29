#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import {
  setSeoEnrichmentRuntimeOverrides,
  seoEnrichmentConfig,
} from '@/lib/seo-enrichment/config';
import { log } from '@/lib/seo-enrichment/logger';
import { SeoEnrichmentWorker } from '@/lib/seo-enrichment/worker';

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.split('=').slice(1).join('=');
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

/** Production Neon (ep-floral-wind) — pass --floral-prod to target live DB. */
const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function applyFloralProd(): void {
  if (!hasFlag('--floral-prod')) return;
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

function applyCliOverrides(): void {
  const vendor = getArg('--vendor')?.trim();
  const brand = getArg('--brand')?.trim();
  const metadataOnly = hasFlag('--metadata-only') || hasFlag('--metadata-only=true');
  const collectiveAugment = hasFlag('--collective-augment') || hasFlag('--collective-augment=true');
  const normaliseDescription = hasFlag('--normalise-description') || hasFlag('--normalise-description=true');
  const noNormalise = hasFlag('--no-normalise-description');

  if (vendor || brand || metadataOnly || collectiveAugment || normaliseDescription || noNormalise) {
    setSeoEnrichmentRuntimeOverrides({
      ...(vendor ? { vendorFilter: vendor } : {}),
      ...(brand ? { brandFilter: brand } : {}),
      ...(metadataOnly || collectiveAugment ? { metadataOnly: true, productsOnly: true } : {}),
      ...(collectiveAugment ? { collectiveAugment: true } : {}),
      ...(normaliseDescription ? { normaliseDescription: true } : {}),
      ...(noNormalise ? { normaliseDescription: false } : {}),
    });
  }
}

async function main() {
  applyFloralProd();
  applyCliOverrides();

  const worker = new SeoEnrichmentWorker();
  const command = getArg('--command') || (hasFlag('--worker') ? 'worker' : 'once');

  log('info', 'Starting SEO enrichment command', {
    command,
    mode: seoEnrichmentConfig.mode,
    metadataOnly: seoEnrichmentConfig.metadataOnly,
    collectiveAugment: seoEnrichmentConfig.collectiveAugment,
    normaliseDescription: seoEnrichmentConfig.normaliseDescription,
    vendor: seoEnrichmentConfig.vendorFilter || 'all',
    brand: seoEnrichmentConfig.brandFilter || 'all',
    productsOnly: seoEnrichmentConfig.productsOnly,
  });

  if (command === 'select') {
    const selected = await worker.runSelection();
    log('info', 'Selection complete', { selected });
    return;
  }

  if (command === 'once') {
    const selected = await worker.runSelection();
    const processed = await worker.runOnce();
    log('info', 'One-shot run complete', { selected, processed });
    return;
  }

  if (command === 'process') {
    const processed = await worker.runOnce();
    log('info', 'Process complete (no selection)', { processed });
    return;
  }

  if (command === 'worker') {
    await worker.runLoop();
    return;
  }

  if (command === 'retry-failed') {
    const retried = await worker.retryFailed();
    log('info', 'Retry failed complete', { retried });
    return;
  }

  if (command === 'handle') {
    const handle = getArg('--handle')?.trim();
    if (!handle) throw new Error('--handle=<product-handle> is required with --command=handle');
    log('info', 'Processing single handle', { handle });
    const processed = await worker.processHandle(handle);
    log('info', 'Single handle complete', { handle, processed });
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error('[seo-enrichment] fatal error:', error);
  process.exit(1);
});
