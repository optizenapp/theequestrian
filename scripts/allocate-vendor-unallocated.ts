#!/usr/bin/env tsx
/**
 * Allocate unallocated vendor products using product_type → collection_mapping.
 *
 * Usage:
 *   npx tsx scripts/allocate-vendor-unallocated.ts --floral-prod --vendor="Trailrace Equestrian Outfitters"
 *   npx tsx scripts/allocate-vendor-unallocated.ts --floral-prod --vendor="..." --dry-run
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { getPrimaryCategoryPath } from '@/lib/shopify/products';
import { getArg, hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

function vendorPrimaryLike(vendor: string): string {
  const token = vendor.trim().split(/\s+/)[0]?.toLowerCase();
  return token ? `${token}%` : `${vendor.trim().toLowerCase()}%`;
}

type ProductRow = {
  id: string;
  handle: string;
  title: string;
  product_type: string | null;
};

async function fetchUnallocated(vendor: string): Promise<ProductRow[]> {
  return sql`
    SELECT p.id, p.handle, p.title, p.product_type
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE pca.product_id IS NULL
      AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    ORDER BY p.handle
  ` as unknown as ProductRow[];
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const dryRun = hasFlag('--dry-run');

  if (!vendor) {
    console.error('Usage: npx tsx scripts/allocate-vendor-unallocated.ts --vendor="Vendor Name" [--dry-run]');
    process.exit(1);
  }

  console.log('Allocate vendor unallocated products');
  console.log(`  Vendor: ${vendor}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const products = await fetchUnallocated(vendor);
  console.log(`Unallocated products: ${products.length}\n`);

  if (products.length === 0) return;

  let allocated = 0;
  let unmappable = 0;
  const unmappableRows: Array<{ handle: string; title: string; product_type: string }> = [];

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const productType = product.product_type?.trim() || '';
    const categoryPath = productType ? await getPrimaryCategoryPath(productType) : null;

    if (!categoryPath) {
      unmappable += 1;
      unmappableRows.push({
        handle: product.handle,
        title: product.title,
        product_type: productType || '(empty)',
      });
      continue;
    }

    if (dryRun) {
      allocated += 1;
    } else {
      await upsertProductAllocation({
        productId: product.id,
        productHandle: product.handle,
        categoryPath,
      });
      allocated += 1;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  … ${i + 1}/${products.length} processed`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Allocated:  ${allocated}`);
  console.log(`Unmappable: ${unmappable}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (unmappableRows.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = resolve(process.cwd(), 'exports', `unmappable-allocations-${ts}.csv`);
    fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
    fs.writeFileSync(exportPath, stringify(unmappableRows, { header: true }));
    console.log(`Unmappable export: ${exportPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
