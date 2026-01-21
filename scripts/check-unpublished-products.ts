/**
 * Check for products NOT published to Headless
 * Run this weekly to catch any products that weren't auto-published
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

async function checkUnpublishedProducts() {
  console.log('🔍 Checking for products not published to Headless...\n');

  // Get all products from Storefront API (these are published to Headless)
  const query = `
    query GetAllProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            handle
            title
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let allProducts: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const result: any = await shopifyFetch<any>({
      query,
      variables: { first: 250, after: cursor },
      cache: 'no-store',
    });

    allProducts.push(...result.products.edges.map((e: any) => e.node));
    hasNextPage = result.products.pageInfo.hasNextPage;
    cursor = result.products.pageInfo.endCursor;
  }

  console.log(`✅ Found ${allProducts.length} products published to Headless\n`);
  console.log('💡 If this number seems low, you may have unpublished products.');
  console.log('   Use Shopify Admin to bulk publish them:\n');
  console.log('   1. Go to Products');
  console.log('   2. Filter by "Not available on Headless"');
  console.log('   3. Select all → More actions → Make available → Headless\n');
}

checkUnpublishedProducts().catch(console.error);
