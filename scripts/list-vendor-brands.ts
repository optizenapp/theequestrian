#!/usr/bin/env tsx
/**
 * List unique sellable brands for a Collective / marketplace vendor.
 * Uses products.brand when allocated; otherwise resolveProductBrandDisplay.
 *
 * Usage:
 *   npx tsx scripts/list-vendor-brands.ts --floral-prod --vendor=Trailrace
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import {
  buildBrandDisplayLexicon,
  resolveProductBrandDisplay,
} from '@/lib/brands/resolve-product-brand-display';
import { getArg } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

type Row = {
  handle: string;
  title: string | null;
  vendor: string | null;
  brand: string | null;
  brand_hub_handle: string | null;
  tags: string[] | null;
};

function slugVendor(vendor: string): string {
  return vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  if (!vendor) {
    console.error('Usage: npx tsx scripts/list-vendor-brands.ts --vendor=Trailrace [--floral-prod]');
    process.exit(1);
  }

  await ensureProductsBrandColumns();
  const lexicon = buildBrandDisplayLexicon(await getAllPublishedBrandContent());

  const rows = (await sql`
    SELECT handle, title, vendor, brand, brand_hub_handle, tags
    FROM products
    WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${vendor}))
    ORDER BY handle
  `) as unknown as Row[];

  const brandsByKey = new Map<string, string>();
  let fromAllocation = 0;
  let fromInference = 0;
  const unresolvedRows: Row[] = [];

  for (const row of rows) {
    const allocated = row.brand?.trim() || null;
    if (allocated) {
      fromAllocation += 1;
      const key = allocated.toLowerCase();
      if (!brandsByKey.has(key)) brandsByKey.set(key, allocated);
      continue;
    }

    const resolved = resolveProductBrandDisplay(
      {
        brand: row.brand,
        brandHubHandle: row.brand_hub_handle,
        vendor: row.vendor,
        title: row.title,
        tags: Array.isArray(row.tags) ? row.tags : [],
      },
      lexicon
    );

    if (resolved.brand?.trim()) {
      fromInference += 1;
      const label = resolved.brand.trim();
      const key = label.toLowerCase();
      if (!brandsByKey.has(key)) brandsByKey.set(key, label);
    } else {
      unresolvedRows.push(row);
    }
  }

  // Second pass: match remaining titles against brands already seen on this vendor
  const vendorBrandLabels = Array.from(brandsByKey.values()).sort((a, b) => b.length - a.length);
  const unresolved: string[] = [];
  for (const row of unresolvedRows) {
    const title = (row.title || '').toLowerCase();
    const match = vendorBrandLabels.find((label) => title.includes(label.toLowerCase()));
    if (match) {
      fromInference += 1;
    } else {
      unresolved.push(row.handle);
    }
  }

  const brands = Array.from(brandsByKey.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  const outPath = resolve(process.cwd(), `exports/${slugVendor(vendor)}-collective-brands.txt`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });

  const lines = [
    ...brands,
    ...(unresolved.length > 0
      ? ['', `# Unresolved handles (${unresolved.length}):`, ...unresolved.map((h) => `# ${h}`)]
      : []),
  ];
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf-8');

  console.log(`Vendor: ${vendor}`);
  console.log(`Products: ${rows.length}`);
  console.log(`Brands from allocation: ${fromAllocation}`);
  console.log(`Brands from inference: ${fromInference}`);
  console.log(`Unresolved: ${unresolved.length}`);
  console.log(`Unique brands: ${brands.length}`);
  console.log(`Wrote: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
