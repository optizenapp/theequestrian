#!/usr/bin/env tsx
/**
 * Test if vendor matching logic works correctly
 */

import * as fs from 'fs';
import * as path from 'path';

// Simulate the CSV loading from loadRates.ts
const vendorRatesPath = path.join(process.cwd(), 'vendor-shipping.csv');
const vendorRatesContent = fs.readFileSync(vendorRatesPath, 'utf-8');
const lines = vendorRatesContent.split('\n');

interface VendorRate {
  vendor: string;
  shippingCost: number;
}

const vendorRates = new Map<string, VendorRate>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const vendor = parts[0]?.trim();
  const shipping = parts[1]?.trim();
  const tag = parts[2]?.trim();
  
  if (vendor && shipping && !tag) {
    const rate = parseFloat(shipping);
    if (!isNaN(rate)) {
      vendorRates.set(vendor, { vendor, shippingCost: rate });
    }
  }
}

console.log('📋 Loaded vendor rates:');
for (const [key, value] of vendorRates.entries()) {
  console.log(`  Key: "${key}" -> Vendor: "${value.vendor}", Rate: $${value.shippingCost}`);
}

console.log(`\nTotal: ${vendorRates.size} vendors\n`);

// Test matching logic (from offset.ts)
function testMatch(shopifyVendor: string): boolean {
  const vendorLower = shopifyVendor.toLowerCase().trim();
  
  for (const [vendorName, rate] of vendorRates.entries()) {
    if (vendorName.toLowerCase() === vendorLower) {
      console.log(`✓ MATCH: Shopify "${shopifyVendor}" matches CSV "${vendorName}"`);
      return true;
    }
  }
  
  console.log(`✗ NO MATCH: Shopify "${shopifyVendor}"`);
  return false;
}

console.log('🧪 Testing vendor matching:\n');
testMatch('Ascot Saddlery');
testMatch('ascot saddlery');  // lowercase
testMatch('ASCOT SADDLERY');  // uppercase
testMatch('Dapple EQ');
testMatch('Dapple Eq');  // old CSV value
testMatch('Tacklet');
testMatch('Random Vendor');  // should not match

console.log('\n✅ Done!');
