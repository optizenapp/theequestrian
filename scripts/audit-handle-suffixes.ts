#!/usr/bin/env tsx
/**
 * Audit Trailrace products with numeric handle suffixes (-1, -2, …).
 * Diagnose what blocks the canonical handle and export a fix plan CSV.
 *
 * Usage:
 *   npx tsx scripts/audit-handle-suffixes.ts
 *   npx tsx scripts/audit-handle-suffixes.ts --fix --dry-run
 *   npx tsx scripts/audit-handle-suffixes.ts --fix
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

config({ path: resolve(process.cwd(), '.env.local') });

const SUFFIX_RE = /-\d+$/;

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  status: string;
  vendor: string;
};

async function fetchTrailraceProducts(): Promise<ProductNode[]> {
  const rows: ProductNode[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: ProductNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: `query($q: String!, $first: Int!, $after: String) {
        products(first: $first, after: $after, query: $q) {
          edges { node { id handle title status vendor } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: { q: 'vendor:Trailrace', first: 250, after: cursor },
      cache: 'no-store',
    });
    rows.push(...data.products.edges.map((e) => e.node));
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  return rows;
}

async function getByHandle(handle: string): Promise<ProductNode | null> {
  const data = await shopifyAdminFetch<{ productByHandle: ProductNode | null }>({
    query: `query($handle: String!) { productByHandle(handle: $handle) { id handle title status vendor } }`,
    variables: { handle },
    cache: 'no-store',
  });
  return data.productByHandle;
}

function baseHandle(handle: string): string {
  return handle.replace(SUFFIX_RE, '');
}

async function deleteProduct(id: string): Promise<string | null> {
  const data = await shopifyAdminFetch<{
    productDelete: { deletedProductId: string | null; userErrors: Array<{ message: string }> };
  }>({
    query: `mutation($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { message }
      }
    }`,
    variables: { input: { id } },
    cache: 'no-store',
  });
  const errors = data.productDelete.userErrors.map((e) => e.message).join('; ');
  return errors || null;
}

async function renameHandle(id: string, handle: string): Promise<string | null> {
  const data = await shopifyAdminFetch<{
    productUpdate: { product: { handle: string } | null; userErrors: Array<{ message: string }> };
  }>({
    query: `mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { handle }
        userErrors { message }
      }
    }`,
    variables: { input: { id, handle } },
    cache: 'no-store',
  });
  const errors = data.productUpdate.userErrors.map((e) => e.message).join('; ');
  return errors || null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const fix = process.argv.includes('--fix');

  console.log('Fetching Trailrace products from Shopify…');
  const all = await fetchTrailraceProducts();
  const suffixed = all.filter((p) => SUFFIX_RE.test(p.handle));
  console.log(`Total: ${all.length} | Suffixed handles: ${suffixed.length}\n`);

  type Row = {
    suffixed_handle: string;
    target_handle: string;
    product_id: string;
    title: string;
    status: string;
    blocker_handle: string;
    blocker_id: string;
    blocker_vendor: string;
    blocker_status: string;
    action: string;
    notes: string;
  };

  const rows: Row[] = [];

  for (const product of suffixed) {
    const target = baseHandle(product.handle);
    const blocker = await getByHandle(target);
    let action = 'rename_only';
    let notes = '';

    if (blocker && blocker.id !== product.id) {
      if (blocker.status === 'ARCHIVED' || blocker.status === 'DRAFT') {
        action = 'delete_blocker_then_rename';
        notes = `${blocker.status} blocker`;
      } else if (blocker.vendor?.toLowerCase().includes('trail')) {
        action = 'delete_suffixed_duplicate';
        notes = `ACTIVE Trailrace duplicate at ${target} — drop suffixed import`;
      } else {
        action = 'manual_other_vendor';
        notes = `Blocker vendor=${blocker.vendor} status=${blocker.status}`;
      }
    }

    rows.push({
      suffixed_handle: product.handle,
      target_handle: target,
      product_id: product.id,
      title: product.title,
      status: product.status,
      blocker_handle: blocker && blocker.id !== product.id ? blocker.handle : '',
      blocker_id: blocker && blocker.id !== product.id ? blocker.id : '',
      blocker_vendor: blocker && blocker.id !== product.id ? blocker.vendor : '',
      blocker_status: blocker && blocker.id !== product.id ? blocker.status : '',
      action,
      notes,
    });
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {});

  console.log('Action breakdown:');
  for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k}: ${v}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const exportPath = resolve(process.cwd(), 'exports', `handle-suffix-audit-${ts}.csv`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(exportPath, stringify(rows, { header: true }));
  console.log(`\nExport: ${exportPath}`);

  if (!fix) return;

  let fixed = 0;
  let failed = 0;

  for (const row of rows) {
    if (row.action === 'manual_other_vendor') {
      console.warn(`SKIP manual: ${row.suffixed_handle} → ${row.target_handle} (${row.notes})`);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${row.action}: ${row.suffixed_handle} → ${row.target_handle}`);
      continue;
    }

    if (row.action === 'delete_suffixed_duplicate') {
      const delErr = await deleteProduct(row.product_id);
      if (delErr) {
        console.error(`FAIL delete duplicate ${row.suffixed_handle}: ${delErr}`);
        failed += 1;
      } else {
        console.log(`✓ deleted duplicate ${row.suffixed_handle} (kept ${row.target_handle})`);
        fixed += 1;
      }
      continue;
    }

    if (row.action === 'delete_blocker_then_rename' && row.blocker_id) {
      const delErr = await deleteProduct(row.blocker_id);
      if (delErr) {
        console.error(`FAIL delete ${row.blocker_handle}: ${delErr}`);
        failed += 1;
        continue;
      }
      console.log(`Deleted blocker ${row.blocker_handle}`);
    }

    const renErr = await renameHandle(row.product_id, row.target_handle);
    if (renErr) {
      console.error(`FAIL rename ${row.suffixed_handle}: ${renErr}`);
      failed += 1;
    } else {
      console.log(`✓ ${row.suffixed_handle} → ${row.target_handle}`);
      fixed += 1;
    }
  }

  if (!dryRun) console.log(`\nFixed: ${fixed} | Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
