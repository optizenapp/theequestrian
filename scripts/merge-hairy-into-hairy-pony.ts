#!/usr/bin/env tsx
/**
 * Merge duplicate Hairy hub into canonical /brands/hairy-pony.
 *
 *   npx tsx scripts/merge-hairy-into-hairy-pony.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL;
  process.env.POSTGRES_URL = FLORAL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

async function main(): Promise<void> {
  const { sql } = await import('@/lib/db/client');
  const { getBrandContentByHandle, invalidateBrandContentCache } = await import(
    '@/lib/content/brand-content'
  );
  const { countDbProductsForBrand } = await import('@/lib/brands/get-brand-products');

  const hubbed = await sql`
    UPDATE products
    SET brand_hub_handle = 'hairy-pony',
        brand = 'Hairy Pony',
        updated_at = NOW()
    WHERE LOWER(TRIM(COALESCE(brand_hub_handle, ''))) = 'hairy'
       OR LOWER(TRIM(COALESCE(brand, ''))) IN ('hairy', 'hairy pony', 'hairy pony grooming products')
       OR LOWER(handle) LIKE 'hairy-%'
    RETURNING handle
  `;
  console.log(`Repointed products: ${Array.isArray(hubbed) ? hubbed.length : 0}`);

  const removed = await sql`
    DELETE FROM brand_content WHERE handle = 'hairy' RETURNING handle
  `;
  console.log(
    Array.isArray(removed) && removed.length
      ? `Removed brand_content: hairy`
      : 'No hairy brand_content row'
  );

  invalidateBrandContentCache();
  const brand = await getBrandContentByHandle('hairy-pony');
  if (!brand) {
    throw new Error('hairy-pony brand_content missing — run run-brand-seo-update first');
  }
  const count = await countDbProductsForBrand(brand);
  await sql`
    UPDATE brand_content
    SET products_count = ${count}, updated_at = NOW()
    WHERE handle = 'hairy-pony'
  `;
  console.log(`hairy-pony products_count=${count}`);
  invalidateBrandContentCache();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
