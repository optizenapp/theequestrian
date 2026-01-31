#!/usr/bin/env tsx
/**
 * Count total variants in Shopify using GraphQL
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

(async () => {
  console.log('🔍 Counting Shopify products and variants...\n');
  
  // Use GraphQL to get accurate counts
  const query = `
    query {
      productsCount {
        count
      }
      productVariants(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  const result = await shopifyAdminFetch<any>({ query });
  
  console.log(`📦 Total Products: ${result.productsCount.count}`);
  
  // To get variant count, we need to aggregate
  // Let's sample some products to estimate
  const sampleQuery = `
    query {
      products(first: 100) {
        edges {
          node {
            id
            title
            variants(first: 250) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const sampleResult = await shopifyAdminFetch<any>({ query: sampleQuery });
  
  let totalVariants = 0;
  for (const { node: product } of sampleResult.products.edges) {
    totalVariants += product.variants.edges.length;
  }
  
  const avgVariantsPerProduct = totalVariants / 100;
  const estimatedTotalVariants = Math.round(avgVariantsPerProduct * result.productsCount.count);
  
  console.log(`\n📊 Sample Analysis (100 products):`);
  console.log(`   Total variants in sample: ${totalVariants}`);
  console.log(`   Average variants per product: ${avgVariantsPerProduct.toFixed(2)}`);
  console.log(`\n📊 Estimated Total Variants: ${estimatedTotalVariants}`);
  
  console.log('\n✅ Done!');
})();
