#!/usr/bin/env tsx
/**
 * Onboard new Collective handles: assign brand + category URL for unallocated products.
 *
 * Usage:
 *   npx tsx scripts/onboard-vendor-products.ts --vendor="Trailrace Equestrian Outfitters" --brand=Roeckl --category=/rider/gloves
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
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

function brandHandlePrefix(brand: string): string {
  return `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-%`;
}

function vendorPrimaryLike(vendor: string): string {
  const token = vendor.trim().split(/\s+/)[0]?.toLowerCase();
  return token ? `${token}%` : `${vendor.trim().toLowerCase()}%`;
}

type ProductRow = { id: string; handle: string; title: string; has_allocation: boolean };

async function fetchVendorBrandProducts(options: {
  vendor: string;
  brand: string;
  handles?: string[];
}): Promise<ProductRow[]> {
  const vendor = options.vendor.trim();
  const brand = options.brand.trim();
  const handles = options.handles?.filter(Boolean);
  const prefix = brandHandlePrefix(brand);

  if (handles && handles.length > 0) {
    return sql`
      SELECT p.id, p.handle, p.title, (pca.product_id IS NOT NULL) AS has_allocation
      FROM products p
      LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
      WHERE p.handle = ANY(${handles})
        AND ((LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)}))
      ORDER BY p.handle
    ` as unknown as ProductRow[];
  }

  return sql`
    SELECT p.id, p.handle, p.title, (pca.product_id IS NOT NULL) AS has_allocation
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE ((LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)}))
      AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
    ORDER BY p.handle
  ` as unknown as ProductRow[];
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const brand = getArg('--brand')?.trim();
  const categoryPath = getArg('--category')?.trim();
  const handlesFile = getArg('--handles-file');
  const dryRun = hasFlag('--dry-run');

  if (!vendor || !brand || !categoryPath) {
    console.error(
      'Usage: npx tsx scripts/onboard-vendor-products.ts --vendor="Vendor Name" --brand=Roeckl --category=/rider/gloves'
    );
    process.exit(1);
  }

  const normalizedCategory = categoryPath.startsWith('/') ? categoryPath : `/${categoryPath}`;
  const handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;
  const brandHubHandle = slugFromBrandName(brand);

  console.log('Onboard vendor products');
  console.log(`  Vendor: ${vendor}`);
  console.log(`  Brand: ${brand} (${brandHubHandle})`);
  console.log(`  Category: ${normalizedCategory}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (handles?.length) console.log(`  Handles file: ${handles.length} handles`);
  console.log('');

  const products = await fetchVendorBrandProducts({ vendor, brand, handles });
  if (products.length === 0) {
    console.log('No products in DB. Run scoped sync first.');
    process.exit(1);
  }

  const unallocated = products.filter((p) => !p.has_allocation);
  console.log(`Products in scope: ${products.length}`);
  console.log(`Unallocated: ${unallocated.length}\n`);

  if (dryRun) {
    for (const product of unallocated) {
      console.log(`  [dry-run] would allocate ${product.handle} → ${normalizedCategory}`);
    }
    console.log(`\n[dry-run] would set brand=${brand} on ${products.length} products`);
    return;
  }

  await ensureProductsBrandColumns();

  const brandRows = await sql`
    UPDATE products p
    SET brand = ${brand},
        brand_hub_handle = ${brandHubHandle},
        updated_at = NOW()
    WHERE p.id = ANY(${products.map((p) => p.id)})
    RETURNING p.handle
  `;
  console.log(`Brand assigned: ${Array.isArray(brandRows) ? brandRows.length : 0} products`);

  let allocated = 0;
  for (const product of unallocated) {
    const allocation = await upsertProductAllocation({
      productId: product.id,
      productHandle: product.handle,
      categoryPath: normalizedCategory,
    });
    console.log(`  ✓ ${product.handle} → ${allocation.canonical_path}`);
    allocated += 1;
  }

  console.log(`\nAllocated: ${allocated} new products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
