#!/usr/bin/env tsx
import { Pool } from 'pg';

const PROD_URL = "postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: PROD_URL });

async function listVendors() {
  try {
    const result = await pool.query(
      `SELECT vendor_name, base_rate, active 
       FROM vendor_shipping_rates 
       WHERE active = true 
       ORDER BY vendor_name`
    );

    console.log(`\n📋 Active Vendor Shipping Rates (${result.rows.length} total):\n`);
    result.rows.forEach(row => {
      console.log(`   ${row.vendor_name.padEnd(40)} $${row.base_rate}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

listVendors();
