#!/usr/bin/env tsx
/**
 * Sync a vendor/brand subset from Shopify Storefront API into Postgres.
 * Avoids full-catalog db:sync during Collective migrations.
 *
 * Usage:
 *   npx tsx scripts/sync-scoped-products-to-db.ts --vendor=Trailrace --brand=Roeckl
 *   npx tsx scripts/sync-scoped-products-to-db.ts --vendor="..." --handles-file=exports/roeckl-collective-handles.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getProductByHandle } from '@/lib/shopify/products';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { assignBrandColumnsForHandles } from '@/lib/brands/assign-product-brand-columns';
import { syncProductToDb } from './lib/sync-product-to-db';
import { getArg, hasFlag, loadHandlesFromFile } from './lib/migration-cli';
import type { ShopifyProduct } from '@/types/shopify';

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
  return `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-`;
}

function vendorPrimaryToken(vendor: string): string {
  return vendor.trim().split(/\s+/)[0] || vendor.trim();
}

/** Shopify product search — quote multi-word vendors (e.g. vendor:"QJ Riding Wear"). */
function shopifyVendorQuery(vendor: string): string {
  const trimmed = vendor.trim();
  if (trimmed.includes(' ')) return `vendor:"${trimmed}"`;
  return `vendor:${vendorPrimaryToken(trimmed)}`;
}

async function fetchHandlesFromShopify(vendor: string, brand?: string): Promise<string[]> {
  const queryString = shopifyVendorQuery(vendor);

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

/** Storefront omits DRAFT products — Admin fallback for Collective pre-activation sync. */
async function getProductByHandleFromAdmin(handle: string): Promise<ShopifyProduct | null> {
  const data = await shopifyAdminFetch<{
    productByHandle: {
      id: string;
      handle: string;
      title: string;
      descriptionHtml: string;
      vendor: string;
      productType: string;
      tags: string[];
      status: string;
      createdAt: string;
      images: { edges: Array<{ node: { url: string; altText: string | null; width: number; height: number } }> };
      variants: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            price: string;
            compareAtPrice: string | null;
            availableForSale: boolean;
            sku: string | null;
            selectedOptions: Array<{ name: string; value: string }>;
          };
        }>;
      };
    } | null;
  }>({
    query: `
      query ProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id handle title descriptionHtml vendor productType tags status createdAt
          images(first: 10) { edges { node { url altText width height } } }
          variants(first: 100) {
            edges {
              node {
                id title price compareAtPrice availableForSale sku
                selectedOptions { name value }
              }
            }
          }
        }
      }
    `,
    variables: { handle },
    cache: 'no-store',
  });

  const node = data.productByHandle;
  if (!node) return null;

  const prices = node.variants.edges.map((e) => parseFloat(e.node.price)).filter((n) => !Number.isNaN(n));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const currencyCode = 'AUD';

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    descriptionHtml: node.descriptionHtml,
    vendor: node.vendor,
    productType: node.productType,
    tags: node.tags,
    availableForSale: node.status === 'ACTIVE',
    createdAt: node.createdAt,
    priceRange: {
      minVariantPrice: { amount: String(minPrice), currencyCode },
      maxVariantPrice: { amount: String(maxPrice), currencyCode },
    },
    images: node.images,
    variants: {
      edges: node.variants.edges.map((e) => ({
        node: {
          id: e.node.id,
          title: e.node.title,
          availableForSale: e.node.availableForSale,
          price: { amount: e.node.price, currencyCode },
          compareAtPrice: e.node.compareAtPrice
            ? { amount: e.node.compareAtPrice, currencyCode }
            : null,
          sku: e.node.sku,
          selectedOptions: e.node.selectedOptions,
        },
      })),
    },
    collections: { edges: [] },
  };
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
  const syncedHandles: string[] = [];
  const quiet = handles.length > 100;

  for (const handle of handles) {
    let product = await getProductByHandle(handle, { cache: 'no-store' });
    if (!product) {
      product = await getProductByHandleFromAdmin(handle);
      if (product && !quiet) console.log(`  ↳ Admin fallback (draft/unpublished): ${handle}`);
    }
    if (!product) {
      if (!quiet) console.warn(`  ⚠ Not in Storefront or Admin: ${handle}`);
      missing += 1;
      continue;
    }
    if (!vendorMatches(vendor, product.vendor || '')) {
      if (!quiet) console.warn(`  ⚠ Vendor mismatch (${product.vendor}): ${handle}`);
      missing += 1;
      continue;
    }

    const result = await syncProductToDb(product);
    if (result === 'failed') {
      failed += 1;
      console.error(`  ✗ Failed: ${handle}`);
    } else {
      synced += 1;
      syncedHandles.push(handle);
      if (quiet) {
        if (synced % 100 === 0) console.log(`  … ${synced}/${handles.length} synced`);
      } else {
        console.log(`  ✓ ${handle}`);
      }
    }
  }

  let brandAssigned = 0;
  if (syncedHandles.length > 0 && !hasFlag('--skip-brand-assign')) {
    brandAssigned = await assignBrandColumnsForHandles(syncedHandles);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Synced:  ${synced}`);
  console.log(`Missing: ${missing}`);
  console.log(`Failed:  ${failed}`);
  if (syncedHandles.length > 0 && !hasFlag('--skip-brand-assign')) {
    console.log(`Brand columns assigned: ${brandAssigned}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (synced === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
