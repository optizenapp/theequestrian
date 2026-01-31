#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

(async () => {
  const query = `
    query {
      products(first: 1, query: "handle:bird-feeder-funnel") {
        edges {
          node {
            id
            title
            handle
            vendor
            tags
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyAdminFetch<any>({ query });
  const product = result.products.edges[0]?.node;
  
  if (!product) {
    console.log('Product not found');
    return;
  }
  
  console.log(`📦 ${product.title}`);
  console.log(`   Handle: ${product.handle}`);
  console.log(`   Vendor: ${product.vendor}`);
  console.log(`   Tags: ${product.tags.join(', ')}`);
  console.log(`   Product ID: ${product.id}`);
  
  const variant = product.variants.edges[0]?.node;
  console.log(`\n💰 Price: $${variant.price}`);
  console.log(`   Variant ID: ${variant.id}`);
  console.log(`   Compare At: ${variant.compareAtPrice || 'N/A'}`);
})();
