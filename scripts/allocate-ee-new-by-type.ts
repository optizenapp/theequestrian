#!/usr/bin/env tsx
/**
 * Allocate new EE handles using majority category_path of existing EE products
 * with the same product_type. Fallback: /accessories/gifts.
 *
 *   npx tsx scripts/allocate-ee-new-by-type.ts --floral-prod --handles-file=exports/exclusively-equine-new-drafts.csv
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { getArg, hasFlag, loadHandlesFromFile } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

const FALLBACK = '/accessories/gifts';

async function majorityPaths(): Promise<Map<string, string>> {
  const rows = (await sql`
    SELECT
      LOWER(TRIM(COALESCE(p.product_type, ''))) AS product_type,
      pca.category_path,
      COUNT(*)::int AS n
    FROM products p
    JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE LOWER(TRIM(p.vendor)) = 'exclusively equine'
    GROUP BY 1, 2
    ORDER BY 1, n DESC
  `) as Array<{ product_type: string; category_path: string; n: number }>;

  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.product_type)) map.set(row.product_type, row.category_path);
  }
  return map;
}

async function main(): Promise<void> {
  const handlesFile = getArg('--handles-file');
  const dryRun = hasFlag('--dry-run');
  if (!handlesFile) {
    console.error('Usage: --handles-file=exports/exclusively-equine-new-drafts.csv [--dry-run]');
    process.exit(1);
  }

  const handles = loadHandlesFromFile(handlesFile);
  const paths = await majorityPaths();

  const products = (await sql`
    SELECT p.id, p.handle, p.title, p.product_type
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE p.handle = ANY(${handles})
      AND pca.product_id IS NULL
    ORDER BY p.handle
  `) as unknown as Array<{
    id: string;
    handle: string;
    title: string;
    product_type: string | null;
  }>;

  console.log(`Unallocated in file: ${products.length} / ${handles.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  let allocated = 0;
  let fallback = 0;
  const pathCounts = new Map<string, number>();

  for (const product of products) {
    const key = (product.product_type || '').trim().toLowerCase();
    const categoryPath = (key && paths.get(key)) || FALLBACK;
    if (!key || !paths.get(key)) fallback += 1;
    pathCounts.set(categoryPath, (pathCounts.get(categoryPath) || 0) + 1);

    if (!dryRun) {
      await upsertProductAllocation({
        productId: product.id,
        productHandle: product.handle,
        categoryPath,
      });
    }
    allocated += 1;
  }

  console.log(`Allocated: ${allocated} (fallback gifts: ${fallback})`);
  console.log('\nBy path:');
  for (const [path, n] of [...pathCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${path}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
