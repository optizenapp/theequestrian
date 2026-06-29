#!/usr/bin/env tsx
/**
 * Remove ghost brand rows from Postgres after Collective cutover.
 * Deletes products tagged with the brand but not belonging to the live vendor sync.
 *
 * Usage:
 *   npx tsx scripts/cleanup-stale-brand-products.ts --vendor="Trailrace Equestrian Outfitters" --brand=Roeckl
 *   npx tsx scripts/cleanup-stale-brand-products.ts --floral-prod --vendor="..." --brand=Roeckl --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  deleteStaleBrandProducts,
  fetchStaleBrandProductRows,
  getArg,
  hasFlag,
} from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (hasFlag('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const brand = getArg('--brand')?.trim();
  const dryRun = hasFlag('--dry-run');

  if (!vendor || !brand) {
    console.error(
      'Usage: npx tsx scripts/cleanup-stale-brand-products.ts --vendor="Vendor Name" --brand=Roeckl [--floral-prod] [--dry-run]'
    );
    process.exit(1);
  }

  const staleRows = await fetchStaleBrandProductRows({ vendor, brand });

  console.log(`Stale brand rows (brand=${brand}, vendor≠${vendor}): ${staleRows.length}`);
  for (const row of staleRows) {
    console.log(`  ${row.handle} | vendor=${row.vendor || '(empty)'} | ${row.title?.slice(0, 50)}`);
  }

  if (dryRun || staleRows.length === 0) {
    if (dryRun) console.log('\nDry run — no deletes.');
    return;
  }

  const deleted = await deleteStaleBrandProducts({ vendor, brand });
  console.log(`\nDeleted ${deleted.length} ghost products (+ variants and allocations).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
