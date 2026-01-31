#!/usr/bin/env tsx
/**
 * Migrate Vendor Shipping Rates from CSV to Postgres
 * One-time migration script
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

interface VendorRate {
  vendor: string;
  baseRate: number;
  tagOverrides: Record<string, number>;
}

async function migrateRates() {
  console.log('🚀 Migrating vendor shipping rates from CSV to Postgres...\n');

  const client = await pool.connect();
  
  try {
    // Read CSV
    const csvPath = path.join(process.cwd(), 'vendor-shipping.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');

    const vendorRates = new Map<string, VendorRate>();
    const tagRates = new Map<string, number>();

    // Parse CSV
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      const vendor = parts[0]?.trim();
      const shipping = parts[1]?.trim();
      const tag = parts[2]?.trim();
      
      if (!vendor || !shipping) continue;
      
      const rate = parseFloat(shipping);
      if (isNaN(rate)) continue;

      if (tag) {
        // Tag-specific rate for this vendor
        if (!vendorRates.has(vendor)) {
          vendorRates.set(vendor, {
            vendor,
            baseRate: 0,
            tagOverrides: {}
          });
        }
        vendorRates.get(vendor)!.tagOverrides[tag] = rate;
      } else {
        // Base rate for vendor
        if (!vendorRates.has(vendor)) {
          vendorRates.set(vendor, {
            vendor,
            baseRate: rate,
            tagOverrides: {}
          });
        } else {
          vendorRates.get(vendor)!.baseRate = rate;
        }
      }
    }

    console.log(`📋 Parsed ${vendorRates.size} vendors from CSV\n`);

    // Insert into Postgres
    let vendorCount = 0;
    for (const [vendor, data] of vendorRates.entries()) {
      await client.query(
        `INSERT INTO vendor_shipping_rates (
          vendor_name,
          base_rate,
          tag_overrides,
          active
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (vendor_name) 
        DO UPDATE SET
          base_rate = EXCLUDED.base_rate,
          tag_overrides = EXCLUDED.tag_overrides,
          updated_at = NOW()`,
        [vendor, data.baseRate, JSON.stringify(data.tagOverrides), true]
      );
      
      vendorCount++;
      const tagCount = Object.keys(data.tagOverrides).length;
      console.log(`✓ ${vendor.padEnd(40)} Base: $${data.baseRate}${tagCount > 0 ? `, Tags: ${tagCount}` : ''}`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   ${vendorCount} vendors migrated to Postgres`);

    // Show summary
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE base_rate > 0) as with_base_rate,
        COUNT(*) FILTER (WHERE tag_overrides != '{}') as with_tag_overrides
      FROM vendor_shipping_rates
      WHERE active = true
    `);

    console.log(`\n📊 Database Summary:`);
    console.log(`   Total vendors: ${summary.rows[0].total}`);
    console.log(`   With base rate > 0: ${summary.rows[0].with_base_rate}`);
    console.log(`   With tag overrides: ${summary.rows[0].with_tag_overrides}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRates();
