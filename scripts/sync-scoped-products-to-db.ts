#!/usr/bin/env tsx
/**
 * Sync a vendor/brand subset from Shopify Storefront API into Postgres.
 * Avoids full-catalog db:sync during Collective migrations.
 *
 * Usage:
 *   npx tsx scripts/sync-scoped-products-to-db.ts --vendor="Trailrace Equestrian Outfitters" --brand=Roeckl
 *   npx tsx scripts/sync-scoped-products-to-db.ts --vendor="..." --handles-file=exports/roeckl-collective-handles.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getProductByHandle } from '@/lib/shopify/products';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { syncProductToDb } from './lib/sync-product-to-db';
import { getArg, loadHandlesFromFile } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function brandHandlePrefix(brand: string): string {
  return `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-`;
}

function vendorPrimaryToken(vendor: string): string {
  return vendor.trim().split(/\s+/)[0] || vendor.trim();
}

async function fetchHandlesFromShopify(vendor: string, brand?: string): Promise<string[]> {
  const queryString = `vendor:${vendorPrimaryToken(vendor)}`;

  const query = `
    query ScopedProducts($query: String!, $first: Int!, $after: String) {
      products(first: $first, after: $after, query: $query) {
        edges { node { handle title status vendor } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const handles: string[] = [];
  const prefix = brand ? brandHandlePrefix(brand) : null;
  const brandLower = brand?.trim().toLowerCase();
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: { handle: string; title: string; status: string; vendor: string } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query,
      variables: { query: queryString, first: 100, after: cursor },
      cache: 'no-store',
    });

    for (const edge of data.products.edges) {
      const node = edge.node;
      if (node.status !== 'ACTIVE' && node.status !== 'DRAFT') continue;
      if (brandLower) {
        const matchesPrefix = prefix ? node.handle.toLowerCase().startsWith(prefix) : false;
        const matchesTitle = node.title.toLowerCase().includes(brandLower);
        if (!matchesPrefix && !matchesTitle) continue;
      }
      handles.push(node.handle);
    }

    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return [...new Set(handles)].sort();
}

function vendorMatches(expected: string, actual: string): boolean {
  const expectedNorm = expected.trim().toLowerCase();
  const actualNorm = actual.trim().toLowerCase();
  if (expectedNorm === actualNorm) return true;
  return expectedNorm.includes(actualNorm) || actualNorm.includes(expectedNorm);
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const brand = getArg('--brand')?.trim();
  const handlesFile = getArg('--handles-file');

  if (!vendor) {
    console.error(
      'Usage: npx tsx scripts/sync-scoped-products-to-db.ts --vendor="Vendor Name" [--brand=Roeckl] [--handles-file=path.csv]'
    );
    process.exit(1);
  }

  let handles = handlesFile ? loadHandlesFromFile(handlesFile) : await fetchHandlesFromShopify(vendor, brand);

  if (handles.length === 0) {
    console.error('No handles resolved. Check vendor/brand filters or handles file.');
    process.exit(1);
  }

  console.log('Scoped product sync');
  console.log(`  Vendor: ${vendor}`);
  if (brand) console.log(`  Brand: ${brand}`);
  if (handlesFile) console.log(`  Handles file: ${handlesFile}`);
  console.log(`  Handles: ${handles.length}\n`);

  let synced = 0;
  let missing = 0;
  let failed = 0;

  for (const handle of handles) {
    const product = await getProductByHandle(handle, { cache: 'no-store' });
    if (!product) {
      console.warn(`  ⚠ Not in Storefront: ${handle}`);
      missing += 1;
      continue;
    }
    if (!vendorMatches(vendor, product.vendor || '')) {
      console.warn(`  ⚠ Vendor mismatch (${product.vendor}): ${handle}`);
      missing += 1;
      continue;
    }

    const result = await syncProductToDb(product);
    if (result === 'failed') {
      failed += 1;
      console.error(`  ✗ Failed: ${handle}`);
    } else {
      synced += 1;
      console.log(`  ✓ ${handle}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Synced:  ${synced}`);
  console.log(`Missing: ${missing}`);
  console.log(`Failed:  ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (synced === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
