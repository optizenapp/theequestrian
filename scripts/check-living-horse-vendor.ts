#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

(async () => {
  const query = `
    query {
      products(first: 10, query: "Living Horse") {
        edges {
          node {
            id
            title
            vendor
          }
        }
      }
    }
  `;

  const result = await shopifyAdminFetch<any>({ query });
  
  console.log('🔍 Products matching "Living Horse":\n');
  
  if (result.products.edges.length === 0) {
    console.log('❌ No products found');
  } else {
    result.products.edges.forEach(({ node }: any) => {
      console.log(`Vendor: "${node.vendor}"`);
      console.log(`Title: ${node.title}`);
      console.log(`ID: ${node.id}\n`);
    });
  }
  
  console.log('✅ Done!');
})();
