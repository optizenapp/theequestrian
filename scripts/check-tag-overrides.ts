#!/usr/bin/env tsx
import { Pool } from 'pg';

const PROD_URL = "postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: PROD_URL });

async function checkTagOverrides() {
  try {
    const result = await pool.query(
      `SELECT vendor_name, base_rate, tag_overrides 
       FROM vendor_shipping_rates 
       WHERE active = true 
       AND tag_overrides != '{}'
       ORDER BY vendor_name`
    );

    console.log(`\n📋 Vendors with Tag Overrides (${result.rows.length} total):\n`);
    result.rows.forEach(row => {
      console.log(`   ${row.vendor_name.padEnd(40)} Base: $${row.base_rate}`);
      console.log(`      Tag Overrides: ${JSON.stringify(row.tag_overrides, null, 2)}`);
    });

    if (result.rows.length === 0) {
      console.log('   ⚠️  No tag overrides found! They may not have been migrated.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTagOverrides();
