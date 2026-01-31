#!/usr/bin/env tsx
/**
 * Simple Audit: Count products in Shopify vs Audit Database
 * 
 * This gives us a quick count without fetching all products
 */

import { pool } from '../db/index.js';
import { loadVendorRates, loadTagRates } from '../csv/loadRates.js';

(async () => {
  console.log('🔍 Quick Audit: Price Offset Coverage\n');
  
  const vendorRates = loadVendorRates();
  const tagRates = loadTagRates();
  
  console.log(`[Audit] Loaded ${vendorRates.size} vendor rates`);
  console.log(`[Audit] Loaded ${tagRates.size} tag rates\n`);
  
  // Get stats from audit database
  const totalResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM shopify_price_audit
  `);
  
  const withOffsetResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM shopify_price_audit
    WHERE shipping_offset IS NOT NULL AND shipping_offset > 0
  `);
  
  const withoutOffsetResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM shopify_price_audit
    WHERE shipping_offset IS NULL OR shipping_offset = 0
  `);
  
  const bulkSourceResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM shopify_price_audit
    WHERE last_source = 'bulk'
  `);
  
  const webhookSourceResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM shopify_price_audit
    WHERE last_source = 'webhook'
  `);
  
  // Get vendor breakdown
  const vendorBreakdown = await pool.query(`
    SELECT 
      vendor_name,
      COUNT(*) as variant_count,
      AVG(shipping_offset) as avg_offset,
      MIN(updated_at) as first_update,
      MAX(updated_at) as last_update
    FROM shopify_price_audit
    WHERE shipping_offset > 0
    GROUP BY vendor_name
    ORDER BY variant_count DESC
    LIMIT 20
  `);
  
  console.log('='.repeat(80));
  console.log('📊 AUDIT DATABASE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total variants in audit: ${totalResult.rows[0].count}`);
  console.log(`✅ With shipping offset: ${withOffsetResult.rows[0].count}`);
  console.log(`⚪ Without shipping offset (vendor has $0 shipping): ${withoutOffsetResult.rows[0].count}`);
  console.log(`\nProcessing source:`);
  console.log(`  - Bulk script: ${bulkSourceResult.rows[0].count}`);
  console.log(`  - Webhook: ${webhookSourceResult.rows[0].count}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 TOP 20 VENDORS WITH OFFSETS');
  console.log('='.repeat(80));
  console.log('Vendor'.padEnd(40) + 'Variants'.padEnd(12) + 'Avg Offset'.padEnd(15) + 'Last Update');
  console.log('-'.repeat(80));
  
  for (const row of vendorBreakdown.rows) {
    const vendor = (row.vendor_name || 'Unknown').substring(0, 38);
    const count = String(row.variant_count).padEnd(12);
    const offset = `$${parseFloat(row.avg_offset).toFixed(2)}`.padEnd(15);
    const lastUpdate = new Date(row.last_update).toLocaleDateString();
    console.log(vendor.padEnd(40) + count + offset + lastUpdate);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  ESTIMATED MISSING PRODUCTS');
  console.log('='.repeat(80));
  console.log('To get exact count of missing products, we need to:');
  console.log('1. Query Shopify for total product/variant count (via GraphQL)');
  console.log('2. Compare with audit database count');
  console.log('3. Account for vendors with $0 shipping (Trailrace, etc.)');
  console.log('\nNote: Shopify has ~14,000 products based on earlier fetch attempts');
  console.log(`      Audit database has ${totalResult.rows[0].count} variants`);
  console.log(`      Estimated missing: ~${14000 - parseInt(totalResult.rows[0].count)} products`);
  
  await pool.end();
  console.log('\n✅ Quick audit complete!');
})();
