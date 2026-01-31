#!/usr/bin/env tsx
/**
 * Spot Check Price Offsets from Audit Database
 */

import { pool } from '../db/index.js';

(async () => {
  console.log('🔍 Spot Checking Price Offsets from Audit Database...\n');
  
  try {
    // Get random sample of 15 products from audit
    const result = await pool.query(`
      SELECT 
        product_id,
        variant_id,
        vendor_name,
        shopify_price,
        shipping_offset,
        adjusted_price,
        last_source,
        updated_at
      FROM shopify_price_audit
      WHERE shipping_offset IS NOT NULL
        AND shipping_offset > 0
      ORDER BY RANDOM()
      LIMIT 15
    `);
    
    console.log(`📊 Found ${result.rows.length} products with price offsets:\n`);
    
    let correct = 0;
    let incorrect = 0;
    
    for (const row of result.rows) {
      console.log(`${'='.repeat(80)}`);
      console.log(`Variant ID: ${row.variant_id}`);
      console.log(`Vendor: ${row.vendor_name}`);
      console.log(`Original Price: $${parseFloat(row.shopify_price).toFixed(2)}`);
      console.log(`Shipping Offset: $${parseFloat(row.shipping_offset).toFixed(2)}`);
      console.log(`Adjusted Price: $${parseFloat(row.adjusted_price).toFixed(2)}`);
      
      const expected = parseFloat(row.shopify_price) + parseFloat(row.shipping_offset);
      const actual = parseFloat(row.adjusted_price);
      const difference = Math.abs(expected - actual);
      
      console.log(`Expected: $${expected.toFixed(2)}`);
      
      if (difference < 0.01) {
        console.log(`✅ CORRECT - Offset applied correctly`);
        correct++;
      } else {
        console.log(`❌ INCORRECT - Difference: $${difference.toFixed(2)}`);
        incorrect++;
      }
      
      console.log(`Source: ${row.last_source}`);
      console.log(`Updated: ${new Date(row.updated_at).toLocaleString()}`);
      console.log('');
    }
    
    console.log(`${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ Correct: ${correct}`);
    console.log(`❌ Incorrect: ${incorrect}`);
    console.log(`📊 Total checked: ${result.rows.length}`);
    
    if (incorrect > 0) {
      console.log(`\n⚠️  WARNING: ${incorrect} products have incorrect price calculations!`);
    } else if (correct > 0) {
      console.log(`\n✅ All checked products have correct price offsets!`);
    }
    
    // Check if webhook is maintaining prices
    const webhookCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM shopify_price_audit
      WHERE last_source = 'webhook'
        AND updated_at > NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`\n🔔 Webhook activity (last 24 hours): ${webhookCount.rows[0].count} updates`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
  
  console.log('\n✅ Done!');
})();
