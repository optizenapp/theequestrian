#!/usr/bin/env tsx
/**
 * Count ALL variants for vendors with price offsets (with full pagination)
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
const vendorRates = new Map<string, number>();

// Parse CSV (Vendor,Shipping,Tag,... columns)
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const vendor = parts[0]?.trim();
  const shipping = parts[1]?.trim();
  const tag = parts[2]?.trim();
  
  if (vendor && shipping && !tag) {
    const rate = parseFloat(shipping);
    if (!isNaN(rate) && rate > 0) {
      vendorRates.set(vendor, rate);
    }
  }
}

console.log('🔍 Counting ALL variants for vendors with price offsets (full pagination)...\n');
console.log(`📋 Loaded ${vendorRates.size} vendors with offsets\n`);

let totalProducts = 0;
let totalVariants = 0;

(async () => {
  for (const [vendor, rate] of vendorRates.entries()) {
    let vendorProducts = 0;
    let vendorVariants = 0;
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const query = `
        query($vendor: String!, $cursor: String) {
          products(first: 250, query: $vendor, after: $cursor) {
            edges {
              cursor
              node {
                id
                title
                vendor
                variants(first: 250) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `;

      try {
        const result: any = await shopifyAdminFetch<any>({ 
          query, 
          variables: { 
            vendor: `vendor:"${vendor}"`,
            cursor
          }
        });

        const products = result.products.edges;
        
        for (const { node: product, cursor: edgeCursor } of products) {
          vendorProducts++;
          vendorVariants += product.variants.edges.length;
          cursor = edgeCursor;
        }

        hasNextPage = result.products.pageInfo.hasNextPage;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.log(`✗ ${vendor.padEnd(40)} Error: ${error.message}`);
        hasNextPage = false;
      }
    }

    totalProducts += vendorProducts;
    totalVariants += vendorVariants;

    console.log(`✓ ${vendor.padEnd(40)} ${vendorProducts} products, ${vendorVariants} variants`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total vendors with offsets: ${vendorRates.size}`);
  console.log(`Total products from these vendors: ${totalProducts}`);
  console.log(`Total variants from these vendors: ${totalVariants}`);

  console.log('\n✅ Done!');
})();
