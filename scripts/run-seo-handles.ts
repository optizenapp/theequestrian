#!/usr/bin/env tsx
/**
 * Apply Collective metadata-only SEO for a handle list.
 *
 *   SEO_ENRICHMENT_MODE=apply npx tsx scripts/run-seo-handles.ts --floral-prod \
 *     --metadata-only --collective-augment --normalise-description \
 *     --handles-file=exports/breyer-horses-australia-handles.csv
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getArg(flag: string): string | undefined {
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return undefined;
}

if (hasFlag('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL_NON_POOLING = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

if (!process.env.SEO_ENRICHMENT_MODE) {
  process.env.SEO_ENRICHMENT_MODE = 'apply';
}

import { setSeoEnrichmentRuntimeOverrides } from '@/lib/seo-enrichment/config';
import { SeoEnrichmentWorker } from '@/lib/seo-enrichment/worker';
import { loadHandlesFromFile } from './lib/migration-cli';

async function main(): Promise<void> {
  const files: string[] = [];
  for (const arg of process.argv) {
    if (arg.startsWith('--handles-file=')) files.push(arg.slice('--handles-file='.length));
  }
  const single = getArg('--handles-file');
  if (single && !files.includes(single)) files.push(single);
  if (files.length === 0) {
    console.error('Provide --handles-file=path.csv (repeatable)');
    process.exit(1);
  }

  setSeoEnrichmentRuntimeOverrides({
    metadataOnly: true,
    collectiveAugment: hasFlag('--collective-augment') || hasFlag('--collective-augment=true'),
    productsOnly: true,
    ...(hasFlag('--normalise-description') ? { normaliseDescription: true } : {}),
  });

  const handles = [...new Set(files.flatMap((file) => loadHandlesFromFile(file)))];
  const concurrency = Number.parseInt(process.env.SEO_ENRICHMENT_MAX_CONCURRENCY || '4', 10) || 4;
  console.log(`SEO handles: ${handles.length}  mode=${process.env.SEO_ENRICHMENT_MODE}  concurrency=${concurrency}`);

  const worker = new SeoEnrichmentWorker();
  let next = 0;
  let ok = 0;
  let failed = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = next;
      next += 1;
      const handle = handles[index];
      if (!handle) return;
      try {
        await worker.processHandle(handle);
        ok += 1;
        if (ok % 10 === 0) console.log(`  … ${ok + failed}/${handles.length} (ok=${ok} fail=${failed})`);
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${handle}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  console.log(`\nDone. ok=${ok} fail=${failed} total=${handles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
