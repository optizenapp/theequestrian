#!/usr/bin/env tsx
/**
 * Allocate pet Collective products using product_type → collection_mapping.
 * Fallback heuristics for empty types on Pet food Australia.
 *
 *   npx tsx scripts/allocate-pet-collective.ts --floral-prod --handles-file=exports/wa-dog-grooming-supplies-drafts.csv
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { getPrimaryCategoryPath } from '@/lib/shopify/products';
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

const FALLBACK_GROOMING = '/pet/dog/grooming';
const FALLBACK_FOOD = '/pet/dog/food';

function heuristicPath(title: string, handle: string): string | null {
  const t = `${title} ${handle}`.toLowerCase();
  if (t.includes('cat food') || t.includes('cat-food')) return '/pet/cat/food';
  if (t.includes('dog treat') || t.includes('treat')) return '/pet/dog/treats';
  if (t.includes('shampoo') || t.includes('parfum') || t.includes('groom')) return FALLBACK_GROOMING;
  if (t.includes('spray bottle') || t.includes('spray-bottle') || handle.includes('spray-bottle'))
    return FALLBACK_GROOMING;
  if (t.includes('bottle') || t.includes('pump') || t.includes('parts')) return FALLBACK_GROOMING;
  if (t.includes('hemp') || t.includes('food') || t.includes('fillet') || t.includes('collective'))
    return FALLBACK_FOOD;
  return null;
}

async function main(): Promise<void> {
  const handlesFile = getArg('--handles-file');
  const dryRun = hasFlag('--dry-run');
  if (!handlesFile) {
    console.error('Usage: --handles-file=exports/...-drafts.csv');
    process.exit(1);
  }

  const handles = loadHandlesFromFile(handlesFile);
  const products = (await sql`
    SELECT p.id, p.handle, p.title, p.product_type
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE p.handle = ANY(${handles})
      AND pca.product_id IS NULL
    ORDER BY p.handle
  `) as unknown as Array<{ id: string; handle: string; title: string; product_type: string | null }>;

  console.log(`Unallocated: ${products.length} / ${handles.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  let allocated = 0;
  let fallback = 0;
  const unmappable: string[] = [];

  for (const product of products) {
    const productType = product.product_type?.trim() || '';
    let categoryPath = productType ? await getPrimaryCategoryPath(productType) : null;
    if (!categoryPath) {
      categoryPath = heuristicPath(product.title || '', product.handle);
      if (categoryPath) fallback += 1;
    }
    if (!categoryPath) {
      unmappable.push(`${product.handle}\t${productType || '(empty)'}`);
      continue;
    }
    if (!dryRun) {
      await upsertProductAllocation({
        productId: product.id,
        productHandle: product.handle,
        categoryPath,
      });
    }
    allocated += 1;
  }

  console.log(`Allocated: ${allocated} (heuristic: ${fallback})`);
  if (unmappable.length) {
    console.log(`Unmappable: ${unmappable.length}`);
    unmappable.forEach((line) => console.log(' ', line));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
