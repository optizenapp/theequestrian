#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

(async () => {
  const query = `
    query {
      products(first: 10, query: "Trailrace") {
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
  
  console.log('🔍 Products matching "Trailrace":\n');
  
  if (result.products.edges.length === 0) {
    console.log('❌ No products found with search "Trailrace"\n');
    
    // Try alternative searches
    console.log('Trying "Trail"...\n');
    const query2 = `
      query {
        products(first: 10, query: "Trail") {
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
    const result2 = await shopifyAdminFetch<any>({ query: query2 });
    
    const trailraceVendors = new Set();
    result2.products.edges.forEach(({ node }: any) => {
      if (node.vendor.toLowerCase().includes('trail')) {
        trailraceVendors.add(node.vendor);
      }
    });
    
    if (trailraceVendors.size > 0) {
      console.log('Found vendors with "trail" in name:');
      trailraceVendors.forEach(v => console.log(`  "${v}"`));
    }
  } else {
    const vendors = new Set();
    result.products.edges.forEach(({ node }: any) => {
      vendors.add(node.vendor);
      console.log(`Vendor: "${node.vendor}"`);
      console.log(`Title: ${node.title}`);
      console.log(`ID: ${node.id}\n`);
    });
    
    console.log('\nUnique vendors found:');
    vendors.forEach(v => console.log(`  "${v}"`));
  }
  
  console.log('\n✅ Done!');
})();
