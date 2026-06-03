#!/usr/bin/env tsx
/**
 * Re-sync genuinely drifted vendor variants to the expected price (vendor price
 * + shipping offset, sale ratio mirrored) computed by the pricing audit.
 *
 * Driven by an audit CSV so it acts only on rows already reviewed. It skips:
 *   - non-drift rows (OK / LOCKED / MISSING_*)
 *   - price-locked variants
 *   - marketplace variants that appear more than once in the CSV (duplicate /
 *     many-to-one mapping pollution — handle those with cleanup first)
 *
 * Read-only by default; pass --apply to push prices to Shopify.
 *
 * Usage:
 *   npm run resync:vendor-drifts -- --csv=exports/vendor-pricing-audit-trailrace-....csv
 *   npm run resync:vendor-drifts -- --csv=... --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import * as fs from 'fs';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';

const DRIFT_FLAGS = new Set(['PRICE_DRIFT', 'COMPARE_DRIFT', 'PRICE_AND_COMPARE_DRIFT']);

interface Args {
  csv?: string;
  apply: boolean;
}

interface DriftRow {
  sku: string;
  marketplaceVariantId: string;
  expectedPrice: string;
  expectedCompareAt: string | null;
  actualPrice: string;
  flag: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (const arg of argv) {
    const csv = arg.match(/^--csv=(.+)$/);
    if (csv) args.csv = csv[1];
    if (arg === '--apply') args.apply = true;
  }
  return args;
}

function loadDriftRows(csvPath: string): DriftRow[] {
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
  const header = lines[0].split(',');
  const col = (name: string): number => header.indexOf(name);
  const iSku = col('sku');
  const iVid = col('marketplace_variant_id');
  const iExpPrice = col('expected_price');
  const iExpCompare = col('expected_compare_at');
  const iActual = col('actual_price');
  const iLocked = col('locked');
  const iFlag = col('flag');

  const variantCounts = new Map<string, number>();
  const parsed = lines.slice(1).map((line) => line.split(','));
  for (const c of parsed) variantCounts.set(c[iVid], (variantCounts.get(c[iVid]) ?? 0) + 1);

  const rows: DriftRow[] = [];
  for (const c of parsed) {
    const flag = c[iFlag];
    if (!DRIFT_FLAGS.has(flag)) continue;
    if (c[iLocked] === 'true') continue;
    if ((variantCounts.get(c[iVid]) ?? 0) > 1) continue; // duplicate-mapped pollution
    const expectedPrice = c[iExpPrice];
    if (!expectedPrice) continue;
    rows.push({
      sku: c[iSku],
      marketplaceVariantId: c[iVid],
      expectedPrice,
      expectedCompareAt: c[iExpCompare] || null,
      actualPrice: c[iActual],
      flag,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  const { csv, apply } = parseArgs(process.argv.slice(2));
  if (!csv) throw new Error('Missing --csv=<audit csv path>');
  if (!fs.existsSync(csv)) throw new Error(`CSV not found: ${csv}`);

  const rows = loadDriftRows(csv);
  console.log(`${rows.length} drift row(s) eligible for re-sync (unique mapping, unlocked).`);
  for (const r of rows.slice(0, 20)) {
    console.log(
      `  ${r.sku || r.marketplaceVariantId} [${r.flag}]: ${r.actualPrice} -> ${r.expectedPrice}` +
        (r.expectedCompareAt ? ` (compare ${r.expectedCompareAt})` : '')
    );
  }
  if (rows.length > 20) console.log(`  ... and ${rows.length - 20} more`);

  if (rows.length === 0) {
    console.log('Nothing to re-sync.');
    return;
  }
  if (!apply) {
    console.log('\nDRY RUN — no prices written. Re-run with --apply to push to Shopify.');
    return;
  }

  let updated = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: r.marketplaceVariantId,
        price: r.expectedPrice,
        compareAtPrice: r.expectedCompareAt,
      });
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`  Failed ${r.marketplaceVariantId}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`\nAPPLIED — updated ${updated} variant(s), ${failed} failed.`);
}

main().catch((error) => {
  console.error('Re-sync failed:', error);
  process.exit(1);
});
