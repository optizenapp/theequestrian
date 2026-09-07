#!/usr/bin/env tsx
/**
 * Onboard Collective drafts: The Canny Company Australia + Serenade-Leather
 *
 *   npx tsx scripts/onboard-canny-serenade-2026-09-07.ts --floral-prod --dry-run
 *   npx tsx scripts/onboard-canny-serenade-2026-09-07.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

type ProductRow = {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  has_allocation: boolean;
};

function serenadePath(product: ProductRow): string {
  const type = (product.product_type || '').trim().toLowerCase();
  const title = product.title.toLowerCase();
  const handle = product.handle.toLowerCase();

  if (
    type.includes('wallet') ||
    type.includes('money clip') ||
    /wallet|billfold|trifold|rfid wallet/.test(title) ||
    /wallet/.test(handle)
  ) {
    return '/rider/luggage';
  }

  if (type.includes('scarf') || /scarf|scarves/.test(title) || /scarf/.test(handle)) {
    return '/clothing/accessories/scarves';
  }

  if (
    type.includes('bag') ||
    type.includes('handbag') ||
    type.includes('vegan') ||
    type.includes('soft leather') ||
    type.includes('cosmetic') ||
    /bag|handbag|cross.?body|xbody|tote|purse|clutch/.test(title) ||
    /bag|handbag|cross-body|xbody|tote/.test(handle)
  ) {
    return '/rider/luggage/bags';
  }

  // Warehouse sale / New In / empty type — title fallback
  if (/wallet|billfold|trifold/.test(title)) return '/rider/luggage';
  if (/scarf/.test(title)) return '/clothing/accessories/scarves';
  return '/rider/luggage/bags';
}

async function fetchVendorProducts(vendor: string): Promise<ProductRow[]> {
  return (await sql`
    SELECT
      p.id,
      p.handle,
      p.title,
      p.vendor,
      p.product_type,
      (pca.product_id IS NOT NULL) AS has_allocation
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor}))
    ORDER BY p.handle
  `) as unknown as ProductRow[];
}

async function assignBrand(
  products: ProductRow[],
  brand: string,
  brandHubHandle: string,
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log(`  [dry-run] would set brand=${brand} hub=${brandHubHandle} on ${products.length}`);
    return products.length;
  }
  const ids = products.map((p) => p.id);
  const rows = await sql`
    UPDATE products
    SET brand = ${brand},
        brand_hub_handle = ${brandHubHandle},
        updated_at = NOW()
    WHERE id = ANY(${ids})
    RETURNING handle
  `;
  return Array.isArray(rows) ? rows.length : 0;
}

async function allocateMany(
  products: ProductRow[],
  pathFor: (p: ProductRow) => string,
  dryRun: boolean
): Promise<{ allocated: number; byPath: Record<string, number> }> {
  const byPath: Record<string, number> = {};
  let allocated = 0;
  for (const product of products) {
    if (product.has_allocation) continue;
    const path = pathFor(product);
    byPath[path] = (byPath[path] || 0) + 1;
    if (dryRun) {
      allocated += 1;
      continue;
    }
    await upsertProductAllocation({
      productId: product.id,
      productHandle: product.handle,
      categoryPath: path,
    });
    allocated += 1;
  }
  return { allocated, byPath };
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  console.log(`Onboard Canny + Serenade (${dryRun ? 'DRY RUN' : 'LIVE'})\n`);
  await ensureProductsBrandColumns();

  // --- Canny ---
  const cannyVendor = 'The Canny Company Australia';
  const cannyProducts = await fetchVendorProducts(cannyVendor);
  console.log(`Canny products in DB: ${cannyProducts.length}`);
  if (!cannyProducts.length) {
    console.warn('  ⚠ Run sync-scoped-products-to-db for Canny first');
  } else {
    const brandN = await assignBrand(cannyProducts, 'Canny', 'canny', dryRun);
    console.log(`  Brand assigned: ${brandN}`);
    const { allocated, byPath } = await allocateMany(
      cannyProducts,
      () => '/pet/dog/collars-and-leads',
      dryRun
    );
    console.log(`  Allocated: ${allocated}`, byPath);
  }

  // --- Serenade ---
  const serenadeVendor = 'Serenade-Leather';
  const serenadeProducts = await fetchVendorProducts(serenadeVendor);
  console.log(`\nSerenade products in DB: ${serenadeProducts.length}`);
  if (!serenadeProducts.length) {
    console.warn('  ⚠ Run sync-scoped-products-to-db for Serenade-Leather first');
  } else {
    const brandN = await assignBrand(serenadeProducts, 'Serenade Leather', 'serenade-leather', dryRun);
    console.log(`  Brand assigned: ${brandN}`);
    const { allocated, byPath } = await allocateMany(serenadeProducts, serenadePath, dryRun);
    console.log(`  Allocated: ${allocated}`);
    console.log('  By path:');
    for (const [path, n] of Object.entries(byPath).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${n}\t${path}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
