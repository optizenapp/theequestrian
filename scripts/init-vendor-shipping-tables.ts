#!/usr/bin/env tsx
/**
 * Initialize Vendor Shipping Rates Tables
 * Creates the necessary tables in Postgres for vendor shipping rates
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  console.error(`   Checked: ${envPath}`);
  process.exit(1);
}

// Create Pool client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initTables() {
  console.log('🚀 Initializing vendor shipping rates tables...\n');

  const client = await pool.connect();
  
  try {
    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'lib/db/schema/vendor-shipping-rates.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute the entire schema as one transaction
    console.log('Executing SQL schema...\n');
    await client.query(schema);

    console.log('✅ Tables created successfully:');
    console.log('   - vendor_shipping_rates');
    console.log('   - shipping_tag_rates');
    console.log('   - Indexes and triggers');

    // Check if tables exist
    const vendorCount = await client.query('SELECT COUNT(*) as count FROM vendor_shipping_rates');
    const tagCount = await client.query('SELECT COUNT(*) as count FROM shipping_tag_rates');

    console.log(`\n📊 Current data:`);
    console.log(`   Vendor rates: ${vendorCount.rows[0].count}`);
    console.log(`   Tag rates: ${tagCount.rows[0].count}`);

    console.log('\n✅ Done! Run the migration script next to import CSV data.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initTables();
