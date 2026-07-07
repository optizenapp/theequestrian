#!/usr/bin/env tsx
/**
 * Purge legacy Webkul vendor rows from Postgres and align with Shopify Collective.
 *
 * Usage:
 *   npx tsx scripts/cleanup-collective-vendor-db.ts --collective-vendor=Trailrace --legacy-vendor="Trailrace Equestrian Outfitters" --dry-run
 *   npx tsx scripts/cleanup-collective-vendor-db.ts --collective-vendor=Trailrace --legacy-vendor="Trailrace Equestrian Outfitters" --sync
 *   npx tsx scripts/cleanup-collective-vendor-db.ts --floral-prod --collective-vendor=Trailrace --legacy-vendor="Trailrace Equestrian Outfitters" --fix-config --purge-audit
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { sql } from '@/lib/db/client';
import { deleteProductVariantsByProductId } from '@/lib/db/product-variants';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getArg, hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (hasFlag('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

interface ProductRow {
  id: string;
  handle: string;
  vendor: string | null;
  title: string | null;
}

async function fetchShopifyHandles(vendor: string): Promise<Set<string>> {
  const handles = new Set<string>();
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: { handle: string } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: `query($q: String!, $first: Int!, $after: String) {
        products(first: $first, after: $after, query: $q) {
          edges { node { handle } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: { q: `vendor:${vendor}`, first: 250, after: cursor },
      cache: 'no-store',
    });

    for (const { node } of data.products.edges) {
      handles.add(node.handle);
    }
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return handles;
}

async function deleteProducts(rows: ProductRow[], dryRun: boolean): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;

  const ids = rows.map((r) => r.id);
  const handles = rows.map((r) => r.handle);

  for (const id of ids) {
    await deleteProductVariantsByProductId(id);
  }

  await sql`
    DELETE FROM product_content_overrides
    WHERE product_id = ANY(${ids}) OR product_handle = ANY(${handles})
  `;
  await sql`
    DELETE FROM product_category_assignments
    WHERE product_id = ANY(${ids}) OR product_handle = ANY(${handles})
  `;
  await sql`DELETE FROM products WHERE id = ANY(${ids})`;

  return rows.length;
}

async function main(): Promise<void> {
  const collectiveVendor = getArg('--collective-vendor')?.trim();
  const legacyVendor = getArg('--legacy-vendor')?.trim();
  const dryRun = hasFlag('--dry-run');
  const doSync = hasFlag('--sync');
  const fixConfig = hasFlag('--fix-config');
  const purgeAudit = hasFlag('--purge-audit');

  if (!collectiveVendor) {
    console.error(
      'Usage: npx tsx scripts/cleanup-collective-vendor-db.ts --collective-vendor=Trailrace [--legacy-vendor="Trailrace Equestrian Outfitters"] [--dry-run] [--sync] [--fix-config] [--purge-audit] [--floral-prod]'
    );
    process.exit(1);
  }

  console.log('Collective vendor DB cleanup');
  console.log(`  Collective vendor: ${collectiveVendor}`);
  if (legacyVendor) console.log(`  Legacy vendor:   ${legacyVendor}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // 1. Legacy vendor rows
  let legacyRows: ProductRow[] = [];
  if (legacyVendor) {
    legacyRows = (await sql`
      SELECT id, handle, vendor, title
      FROM products
      WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${legacyVendor}))
      ORDER BY handle
    `) as ProductRow[];
    console.log(`Legacy vendor products to delete: ${legacyRows.length}`);
    for (const row of legacyRows.slice(0, 20)) {
      console.log(`  - ${row.handle} | ${row.title?.slice(0, 50) ?? ''}`);
    }
    if (legacyRows.length > 20) console.log(`  ... and ${legacyRows.length - 20} more`);
  }

  // 2. Ghost rows — in DB under collective vendor but deleted from Shopify
  const shopifyHandles = await fetchShopifyHandles(collectiveVendor);
  console.log(`\nShopify vendor:${collectiveVendor} handles: ${shopifyHandles.size}`);

  const dbCollectiveRows = (await sql`
    SELECT id, handle, vendor, title
    FROM products
    WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${collectiveVendor}))
    ORDER BY handle
  `) as ProductRow[];

  const ghostRows = dbCollectiveRows.filter((r) => !shopifyHandles.has(r.handle));
  console.log(`Collective vendor ghosts (DB only): ${ghostRows.length}`);
  for (const row of ghostRows.slice(0, 20)) {
    console.log(`  - ${row.handle}`);
  }

  // 3. Orphan allocations
  const orphanAlloc = (await sql`
    SELECT pca.product_handle, pca.canonical_path
    FROM product_category_assignments pca
    LEFT JOIN products p ON p.handle = pca.product_handle
    WHERE p.id IS NULL
    ORDER BY pca.product_handle
  `) as Array<{ product_handle: string; canonical_path: string }>;
  console.log(`\nOrphan category allocations: ${orphanAlloc.length}`);

  if (!dryRun) {
    const deletedLegacy = await deleteProducts(legacyRows, false);
    const deletedGhosts = await deleteProducts(ghostRows, false);
    if (orphanAlloc.length > 0) {
      await sql`DELETE FROM product_category_assignments pca WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.handle = pca.product_handle)`;
    }
    console.log(`\nDeleted ${deletedLegacy} legacy + ${deletedGhosts} ghost products`);
    console.log(`Removed ${orphanAlloc.length} orphan allocations`);
  } else {
    console.log(`\nDry run — would delete ${legacyRows.length} legacy + ${ghostRows.length} ghost products`);
  }

  if (purgeAudit && legacyVendor && !dryRun) {
    const purged = await sql`
      DELETE FROM shopify_price_audit
      WHERE LOWER(TRIM(vendor_name)) = LOWER(TRIM(${legacyVendor}))
      RETURNING variant_id
    `;
    console.log(`Purged ${purged.length} legacy shopify_price_audit rows`);
  } else if (purgeAudit && legacyVendor && dryRun) {
    const count = await sql`
      SELECT COUNT(*)::int AS n FROM shopify_price_audit
      WHERE LOWER(TRIM(vendor_name)) = LOWER(TRIM(${legacyVendor}))
    `;
    console.log(`Would purge ${count[0]?.n ?? 0} legacy shopify_price_audit rows`);
  }

  if (fixConfig && legacyVendor && !dryRun) {
    await sql`
      UPDATE vendor_shop_connections
      SET marketplace_vendor_name = ${collectiveVendor}, updated_at = NOW()
      WHERE LOWER(TRIM(marketplace_vendor_name)) = LOWER(TRIM(${legacyVendor}))
    `;
    await sql`
      UPDATE vendor_shipping_rates
      SET active = false, notes = COALESCE(notes, '') || ' [deactivated: Collective migration]', updated_at = NOW()
      WHERE LOWER(TRIM(vendor_name)) = LOWER(TRIM(${legacyVendor}))
    `;
    console.log('Updated vendor_shop_connections → collective vendor name');
    console.log('Deactivated legacy vendor_shipping_rates row');
  }

  const missingFromDb = [...shopifyHandles].filter(
    (h) => !dbCollectiveRows.some((r) => r.handle === h) || ghostRows.some((g) => g.handle === h)
  );
  console.log(`\nShopify handles missing from DB (after cleanup): ${missingFromDb.length}`);

  if (doSync && !dryRun) {
    const syncVendor = collectiveVendor;
    const floralFlag = hasFlag('--floral-prod') ? ' --floral-prod' : '';
    console.log('\n▶ Running scoped sync...\n');
    execSync(
      `npx tsx scripts/sync-scoped-products-to-db.ts --vendor="${syncVendor}"${floralFlag}`,
      { stdio: 'inherit', cwd: process.cwd() }
    );
  } else if (doSync && dryRun) {
    console.log('\nDry run — would run sync-scoped-products-to-db.ts after cleanup');
  }

  // Final counts
  const finalCollective = await sql`
    SELECT COUNT(*)::int AS n FROM products WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${collectiveVendor}))
  `;
  const finalLegacy = legacyVendor
    ? await sql`
        SELECT COUNT(*)::int AS n FROM products
        WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${legacyVendor}))
      `
    : [{ n: 0 }];
  console.log('\nFinal DB counts:');
  console.log(`  ${collectiveVendor}: ${finalCollective[0]?.n ?? 0}`);
  console.log(`  ${legacyVendor ?? '(legacy)'}: ${finalLegacy[0]?.n ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
