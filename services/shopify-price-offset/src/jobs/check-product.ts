#!/usr/bin/env tsx
/**
 * Check specific product by handle
 */

import { getAllProducts } from '../shopify/client.js';
import { pool } from '../db/index.js';

const HANDLE = 'bird-feeder-funnel';

(async () => {
  console.log(`🔍 Checking product: ${HANDLE}\n`);
  
  // Get from Shopify
  const products = await getAllProducts();
  const product = products.find(p => p.handle === HANDLE);
  
  if (!product) {
    console.log('❌ Product not found in Shopify');
    process.exit(1);
  }
  
  console.log(`📦 ${product.title}`);
  console.log(`   Vendor: ${product.vendor}`);
  console.log(`   Tags: ${product.tags.join(', ')}`);
  console.log(`   Product ID: ${product.id}`);
  
  const variant = product.variants?.[0];
  if (variant) {
    console.log(`\n💰 Current Shopify Price: $${variant.price}`);
    console.log(`   Variant ID: ${variant.id}`);
    
    // Check audit database
    const auditResult = await pool.query(`
      SELECT 
        shopify_price,
        shipping_offset,
        adjusted_price,
        last_source,
        updated_at
      FROM shopify_price_audit
      WHERE variant_id = $1
    `, [variant.id]);
    
    if (auditResult.rows.length > 0) {
      const audit = auditResult.rows[0];
      console.log(`\n📊 Audit Record:`);
      console.log(`   Original Price: $${parseFloat(audit.shopify_price).toFixed(2)}`);
      console.log(`   Shipping Offset: $${audit.shipping_offset ? parseFloat(audit.shipping_offset).toFixed(2) : 'N/A'}`);
      console.log(`   Adjusted Price: $${audit.adjusted_price ? parseFloat(audit.adjusted_price).toFixed(2) : 'N/A'}`);
      console.log(`   Last Source: ${audit.last_source}`);
      console.log(`   Updated: ${new Date(audit.updated_at).toLocaleString()}`);
      
      if (audit.shipping_offset) {
        const expected = parseFloat(audit.shopify_price) + parseFloat(audit.shipping_offset);
        const actual = parseFloat(variant.price);
        const difference = Math.abs(expected - actual);
        
        console.log(`\n✅ Expected Price: $${expected.toFixed(2)}`);
        console.log(`   Actual Price: $${actual.toFixed(2)}`);
        
        if (difference < 0.01) {
          console.log(`   ✅ CORRECT - Price matches expected`);
        } else {
          console.log(`   ❌ INCORRECT - Difference: $${difference.toFixed(2)}`);
        }
      } else {
        console.log(`\n⚠️  No shipping offset for this vendor`);
      }
    } else {
      console.log(`\n⚠️  No audit record found - product may not have been processed by bulk script`);
    }
  }
  
  await pool.end();
  console.log('\n✅ Done!');
})();
