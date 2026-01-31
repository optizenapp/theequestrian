#!/usr/bin/env tsx
/**
 * Check specific product by ID from verification CSV
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

const PRODUCT_ID = 'gid://shopify/Product/21270563';

(async () => {
  console.log(`🔍 Checking product: ${PRODUCT_ID}\n`);
  
  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        vendor
        tags
        variants(first: 5) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              metafields(first: 20) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyAdminFetch<any>({
    query,
    variables: { id: PRODUCT_ID }
  });

  const product = result.product;
  
  console.log(`📦 ${product.title}`);
  console.log(`   Vendor: ${product.vendor}`);
  console.log(`   Tags: ${product.tags.join(', ')}`);
  
  console.log(`\n📋 Variants:`);
  
  for (const { node: variant } of product.variants.edges.slice(0, 3)) {
    console.log(`\n   Variant: ${variant.title}`);
    console.log(`   ID: ${variant.id}`);
    console.log(`   Price: $${variant.price}`);
    console.log(`   Compare At: ${variant.compareAtPrice || 'N/A'}`);
    
    console.log(`   Metafields:`);
    if (variant.metafields.edges.length === 0) {
      console.log(`      (none)`);
    } else {
      for (const { node: meta } of variant.metafields.edges) {
        console.log(`      ${meta.namespace}.${meta.key} = ${meta.value}`);
      }
    }
  }
  
  console.log('\n✅ Done!');
})();
