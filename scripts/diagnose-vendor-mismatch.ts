#!/usr/bin/env tsx
/**
 * Diagnose vendor name mismatches between CSV and Shopify
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import * as fs from 'fs';
import * as path from 'path';

// Load vendor rates from CSV
const vendorRatesPath = path.join(process.cwd(), 'vendor-shipping.csv');
const vendorRatesContent = fs.readFileSync(vendorRatesPath, 'utf-8');
const lines = vendorRatesContent.split('\n');
const csvVendors = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const vendor = parts[0]?.trim();
  const shipping = parts[1]?.trim();
  const tag = parts[2]?.trim();
  
  if (vendor && shipping && !tag) {
    csvVendors.add(vendor);
  }
}

console.log('📋 Vendors in CSV (base rates only):');
Array.from(csvVendors).sort().forEach(v => {
  console.log(`  "${v}" (length: ${v.length}, has trailing space: ${v !== v.trim()})`);
});

console.log(`\nTotal: ${csvVendors.size} vendors\n`);

(async () => {
  console.log('🔍 Checking Shopify for actual vendor names...\n');
  
  const shopifyVendors = new Map<string, number>(); // vendor -> product count
  
  for (const csvVendor of csvVendors) {
    const query = `
      query($vendor: String!) {
        products(first: 5, query: $vendor) {
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

    try {
      const result = await shopifyAdminFetch<any>({ 
        query, 
        variables: { vendor: `vendor:"${csvVendor}"` }
      });

      const products = result.products.edges;
      
      if (products.length > 0) {
        const actualVendor = products[0].node.vendor;
        shopifyVendors.set(actualVendor, products.length);
        
        if (actualVendor !== csvVendor) {
          console.log(`⚠️  MISMATCH:`);
          console.log(`   CSV:     "${csvVendor}"`);
          console.log(`   Shopify: "${actualVendor}"`);
          console.log(`   Diff: ${csvVendor === actualVendor ? 'EXACT MATCH' : 'DIFFERENT'}\n`);
        } else {
          console.log(`✓ "${csvVendor}" matches exactly`);
        }
      } else {
        console.log(`❌ "${csvVendor}" - NO PRODUCTS FOUND IN SHOPIFY\n`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.log(`✗ "${csvVendor}" - Error: ${error.message}\n`);
    }
  }

  console.log('\n✅ Done!');
})();
