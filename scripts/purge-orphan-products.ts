#!/usr/bin/env tsx
/**
 * Delete Neon products (and allocations/overrides) that no longer exist in Shopify.
 *
 * Usage:
 *   npx tsx scripts/purge-orphan-products.ts --floral-prod --dry-run
 *   npx tsx scripts/purge-orphan-products.ts --floral-prod --apply
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { sql } from '@/lib/db/client';
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

type ProductRow = { id: string; handle: string; vendor: string | null; title: string | null };

async function fetchAllShopifyHandles(): Promise<Set<string>> {
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
      query: `query($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges { node { handle } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: { first: 250, after: cursor },
      cache: 'no-store',
    });

    for (const { node } of data.products.edges) handles.add(node.handle);
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return handles;
}

async function deleteBatch(rows: ProductRow[]): Promise<void> {
  const ids = rows.map((r) => r.id);
  const handles = rows.map((r) => r.handle);
  // Bulk deletes — per-id variant deletes are too slow at ~7k scale.
  await sql`DELETE FROM variant_options WHERE product_id = ANY(${ids})`;
  await sql`DELETE FROM product_variants WHERE product_id = ANY(${ids})`;
  await sql`
    DELETE FROM product_content_overrides
    WHERE product_id = ANY(${ids}) OR product_handle = ANY(${handles})
  `;
  await sql`
    DELETE FROM product_category_assignments
    WHERE product_id = ANY(${ids}) OR product_handle = ANY(${handles})
  `;
  await sql`DELETE FROM products WHERE id = ANY(${ids})`;
}

async function main(): Promise<void> {
  const dryRun = !hasFlag('--apply');
  const limitArg = getArg('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;

  console.log(`Purge orphan products (DB rows missing from Shopify)`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const shopifyHandles = await fetchAllShopifyHandles();
  console.log(`Shopify products: ${shopifyHandles.size}`);

  const dbRows = (await sql`
    SELECT id, handle, vendor, title FROM products ORDER BY handle
  `) as ProductRow[];
  console.log(`DB products: ${dbRows.length}`);

  let orphans = dbRows.filter((r) => !shopifyHandles.has(r.handle));
  if (limit && Number.isFinite(limit)) orphans = orphans.slice(0, limit);

  const byVendor = new Map<string, number>();
  for (const row of orphans) {
    const key = (row.vendor || '').trim() || '(blank)';
    byVendor.set(key, (byVendor.get(key) || 0) + 1);
  }

  console.log(`\nOrphans to delete: ${orphans.length}`);
  console.log('By vendor:');
  for (const [vendor, count] of [...byVendor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    console.log(`  ${count}\t${vendor}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = resolve(process.cwd(), `exports/orphan-products-${stamp}.csv`);
  const lines = ['handle,vendor,title,id', ...orphans.map((r) =>
    [r.handle, r.vendor || '', (r.title || '').replace(/"/g, '""'), r.id]
      .map((v) => `"${v}"`)
      .join(',')
  )];
  writeFileSync(csvPath, lines.join('\n'));
  console.log(`\nWrote ${csvPath}`);

  const braceletHandles = (await sql`
    SELECT p.handle
    FROM product_category_assignments pca
    JOIN products p ON p.handle = pca.product_handle
    WHERE pca.category_path = '/rider/jewellery/bracelets'
  `) as Array<{ handle: string }>;
  const braceletOrphans = braceletHandles.filter((r) => !shopifyHandles.has(r.handle)).length;
  console.log(`Bracelets PLP: ${braceletHandles.length} allocated, ${braceletOrphans} orphans`);

  if (dryRun) {
    console.log('\nDry run — pass --apply to delete.');
    return;
  }

  const BATCH = 200;
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const batch = orphans.slice(i, i + BATCH);
    await deleteBatch(batch);
    deleted += batch.length;
    console.log(`  deleted ${deleted}/${orphans.length}`);
  }

  const orphanAlloc = await sql`
    DELETE FROM product_category_assignments pca
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.handle = pca.product_handle)
    RETURNING product_handle
  `;
  console.log(`\nDeleted ${deleted} orphan products`);
  console.log(`Removed ${orphanAlloc.length} dangling allocations`);

  const remaining = await sql`SELECT COUNT(*)::int AS n FROM products`;
  console.log(`DB products remaining: ${remaining[0]?.n ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
