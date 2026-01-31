#!/usr/bin/env tsx
/**
 * Count variants for vendors that have price offsets
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
  const shipping = parts[1]?.trim(); // Shipping is column 2 (index 1)
  const tag = parts[2]?.trim();
  
  if (vendor && shipping && !tag) { // Only base rates (no tag-specific)
    const rate = parseFloat(shipping);
    if (!isNaN(rate) && rate > 0) {
      vendorRates.set(vendor, rate); // Keep original casing for Shopify query
    }
  }
}

(async () => {
  console.log('🔍 Counting variants for vendors with price offsets...\n');
  console.log(`📋 Loaded ${vendorRates.size} vendors with offsets:\n`);

  Array.from(vendorRates.entries()).forEach(([vendor, rate]) => {
    console.log(`   ${vendor}: $${rate}`);
  });

  console.log('\n📊 Querying Shopify for each vendor...\n');

  let totalProducts = 0;
  let totalVariants = 0;

  for (const [vendor, rate] of vendorRates.entries()) {
  // Query for this vendor
  const query = `
    query($vendor: String!) {
      products(first: 250, query: $vendor) {
        edges {
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
    const result = await shopifyAdminFetch<any>({ 
      query, 
      variables: { vendor: `vendor:"${vendor}"` }
    });

    const products = result.products.edges;
    const productCount = products.length;
    let variantCount = 0;

    for (const { node: product } of products) {
      variantCount += product.variants.edges.length;
    }

    totalProducts += productCount;
    totalVariants += variantCount;

    console.log(`✓ ${vendor.padEnd(40)} ${productCount} products, ${variantCount} variants`);
    
    if (result.products.pageInfo.hasNextPage) {
      console.log(`  ⚠️  Has more than 250 products (needs pagination)`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error: any) {
    console.log(`✗ ${vendor.padEnd(40)} Error: ${error.message}`);
  }
}

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total vendors with offsets: ${vendorRates.size}`);
  console.log(`Total products from these vendors: ${totalProducts}`);
  console.log(`Total variants from these vendors: ${totalVariants}`);
  console.log(`\nNote: This is a first-page count (250 products per vendor max)`);
  console.log(`      Some vendors may have more products requiring pagination`);

  console.log('\n✅ Done!');
})();
