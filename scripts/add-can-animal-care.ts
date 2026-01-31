#!/usr/bin/env tsx
import { Pool } from 'pg';

const PROD_URL = "postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: PROD_URL });

async function addVendor() {
  try {
    const result = await pool.query(
      `INSERT INTO vendor_shipping_rates (
        vendor_name,
        base_rate,
        tag_overrides,
        active,
        notes
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (vendor_name) 
      DO UPDATE SET
        base_rate = EXCLUDED.base_rate,
        updated_at = NOW()
      RETURNING *`,
      ['CAN Animal Care', 20.00, '{}', true, 'Added manually']
    );

    console.log('✅ CAN Animal Care added successfully:');
    console.log(`   Vendor: ${result.rows[0].vendor_name}`);
    console.log(`   Base Rate: $${result.rows[0].base_rate}`);
    console.log(`   Active: ${result.rows[0].active}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addVendor();
