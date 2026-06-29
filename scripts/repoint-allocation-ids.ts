#!/usr/bin/env tsx
/**
 * Re-point product_category_assignments.product_id after Collective re-import.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import {
  fetchStaleAllocations,
  getArg,
  hasFlag,
  loadHandlesFromFile,
  repointStaleAllocations,
} from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type StaleRow = {
  product_handle: string;
  old_product_id: string;
  new_product_id: string;
  canonical_path: string;
  title: string;
  vendor: string | null;
};

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const vendor = getArg('--vendor')?.trim() || '';
  const brand = getArg('--brand')?.trim();
  const handlesFile = getArg('--handles-file');
  const handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;

  if (!vendor) {
    console.error('Usage: npx tsx scripts/repoint-allocation-ids.ts --vendor="Vendor Name" [--brand=Roeckl]');
    process.exit(1);
  }

  console.log('Re-point allocation product IDs');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Vendor: ${vendor}`);
  if (brand) console.log(`  Brand: ${brand}`);
  console.log('');

  const staleRows = (await fetchStaleAllocations({ vendor, brand, handles })) as unknown as StaleRow[];

  if (staleRows.length === 0) {
    console.log('No stale allocation IDs found.');
    return;
  }

  console.log(`Found ${staleRows.length} allocations with stale product_id\n`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const exportPath = resolve(process.cwd(), 'exports', `repoint-allocation-ids-${ts}.csv`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(exportPath, stringify(staleRows, { header: true }));
  console.log(`Exported preview: ${exportPath}\n`);

  if (dryRun) {
    console.log('Dry run — no database updates.');
    return;
  }

  const { updated, overrides } = await repointStaleAllocations({ vendor, brand, handles });
  console.log(`Updated ${Array.isArray(updated) ? updated.length : 0} product_category_assignments rows`);
  console.log(`Updated ${Array.isArray(overrides) ? overrides.length : 0} product_content_overrides.product_id rows`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
