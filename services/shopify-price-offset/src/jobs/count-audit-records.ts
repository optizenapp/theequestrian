#!/usr/bin/env tsx
/**
 * Count records in shopify_price_audit database
 */

import { pool } from '../db/index.js';

(async () => {
  console.log('📊 Counting audit database records...\n');

  const client = await pool.connect();
  
  try {
    // Total count
    const totalResult = await client.query(`
      SELECT COUNT(*) as count
      FROM shopify_price_audit
    `);
    console.log(`Total variants in audit: ${totalResult.rows[0].count}`);

    // By vendor
    const byVendor = await client.query(`
      SELECT 
        vendor_name,
        COUNT(*) as variant_count,
        COUNT(DISTINCT product_id) as product_count
      FROM shopify_price_audit
      GROUP BY vendor_name
      ORDER BY variant_count DESC
    `);

    console.log('\n📦 By Vendor:');
    for (const row of byVendor.rows) {
      console.log(`  ${row.vendor_name.padEnd(40)} ${row.product_count} products, ${row.variant_count} variants`);
    }

    // By source
    const bySource = await client.query(`
      SELECT 
        last_source,
        COUNT(*) as count
      FROM shopify_price_audit
      GROUP BY last_source
    `);

    console.log('\n🔄 By Source:');
    for (const row of bySource.rows) {
      console.log(`  ${row.last_source}: ${row.count}`);
    }

    console.log('\n✅ Done!');
  } finally {
    client.release();
    await pool.end();
  }
  
  process.exit(0);
})();
