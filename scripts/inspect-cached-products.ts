#!/usr/bin/env tsx
/**
 * Inspect what product types are actually being returned for horse/boots
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getProductsByTypes } from '@/lib/shopify/products';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';

(async () => {
  console.log('🔍 Checking what products are returned for horse/boots...\n');
  
  // Get allowed product types from mapping
  const allowedTypes = await getProductTypesForCollection('horse', 'boots');
  console.log(`📋 Allowed product types (${allowedTypes.length}):`);
  allowedTypes.slice(0, 10).forEach(t => console.log(`   - "${t}"`));
  if (allowedTypes.length > 10) {
    console.log(`   ... and ${allowedTypes.length - 10} more`);
  }
  
  // Fetch products
  console.log('\n📦 Fetching products...\n');
  const result = await getProductsByTypes(allowedTypes, 50);
  
  console.log(`\n📊 Got ${result.products.length} products (total: ${result.totalCount})\n`);
  
  // Group by product_type
  const byType = new Map<string, number>();
  result.products.forEach(p => {
    const type = p.productType || 'N/A';
    byType.set(type, (byType.get(type) || 0) + 1);
  });
  
  console.log(`🏷️  Product types in results (${byType.size} unique):\n`);
  Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const allowed = allowedTypes.includes(type);
      const emoji = allowed ? '✅' : '❌';
      console.log(`   ${emoji} "${type}": ${count} products`);
    });
  
  // Show examples of disallowed products
  const disallowed = result.products.filter(p => !allowedTypes.includes(p.productType));
  if (disallowed.length > 0) {
    console.log(`\n❌ FOUND ${disallowed.length} products with disallowed types:\n`);
    disallowed.slice(0, 5).forEach(p => {
      console.log(`   - ${p.handle}`);
      console.log(`     Type: "${p.productType}"`);
      console.log(`     URL: http://localhost:3003/products/${p.handle}`);
    });
  } else {
    console.log('\n✅ All products have allowed types!');
  }
  
  console.log('\n✅ Done!');
})();
