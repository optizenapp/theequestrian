#!/usr/bin/env tsx
/**
 * Allocate a single Shopify product to a category path by numeric ID.
 * Fetches the product handle from Shopify (Admin API), then upserts into product_category_assignments.
 *
 * Usage: npx tsx scripts/allocate-product-by-id.ts <productId> <categoryPath>
 * Example: npx tsx scripts/allocate-product-by-id.ts 10390130524452 /horse/boots/therapy
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { upsertProductAllocation } from '@/lib/db/product-allocations';

const GID_PREFIX = 'gid://shopify/Product/';

async function getProductHandle(productId: string): Promise<string> {
  const gid = productId.startsWith(GID_PREFIX) ? productId : `${GID_PREFIX}${productId}`;
  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        handle
        title
      }
    }
  `;
  const result = await shopifyAdminFetch<{ product: { id: string; handle: string; title: string } | null }>({
    query,
    variables: { id: gid },
  });
  if (!result.product) {
    throw new Error(`Product not found: ${gid}`);
  }
  return result.product.handle;
}

async function main() {
  const productIdArg = process.argv[2];
  const categoryPathArg = process.argv[3];

  if (!productIdArg || !categoryPathArg) {
    console.error('Usage: npx tsx scripts/allocate-product-by-id.ts <productId> <categoryPath>');
    console.error('Example: npx tsx scripts/allocate-product-by-id.ts 10390130524452 /horse/boots/therapy');
    process.exit(1);
  }

  const productId = productIdArg.trim();
  const categoryPath = categoryPathArg.trim().startsWith('/')
    ? categoryPathArg.trim()
    : `/${categoryPathArg.trim()}`;

  const gid = productId.startsWith(GID_PREFIX) ? productId : `${GID_PREFIX}${productId}`;

  console.log(`Fetching product ${gid} from Shopify...`);
  const handle = await getProductHandle(productId);
  console.log(`Handle: ${handle}`);

  console.log(`Upserting allocation: ${categoryPath}`);
  const allocation = await upsertProductAllocation({
    productId: gid,
    productHandle: handle,
    categoryPath,
  });

  console.log('Allocation saved:');
  console.log(`  canonical_path: ${allocation.canonical_path}`);
  console.log(`  category_path: ${allocation.category_path}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
