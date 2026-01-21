/**
 * Get All Unique Vendors from Database
 * 
 * This script queries the database to get all unique vendors
 * and creates a CSV template for you to fill in shipping rates
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { sql } from '@/lib/db/client';
import fs from 'fs';
import path from 'path';

async function getAllVendors() {
  console.log('📦 Fetching all unique vendors from database...\n');

  try {
    // Get all unique vendors with product counts
    const vendors = await sql`
      SELECT 
        vendor,
        COUNT(*) as product_count
      FROM products
      WHERE vendor IS NOT NULL AND vendor != ''
      GROUP BY vendor
      ORDER BY vendor ASC
    `;

    console.log(`✅ Found ${vendors.length} unique vendors\n`);
    console.log('Vendors:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    vendors.forEach((v: any) => {
      console.log(`  ${v.vendor} (${v.product_count} products)`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create CSV template
    const csvPath = path.join(process.cwd(), 'exports', 'vendor-shipping-rates-TEMPLATE.csv');
    const csvLines = ['vendor,shipping_cost,notes'];
    
    vendors.forEach((v: any) => {
      // Add empty shipping_cost for user to fill in
      csvLines.push(`${v.vendor},,${v.product_count} products`);
    });

    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
    
    console.log(`📝 Created CSV template: ${csvPath}`);
    console.log('\nNext steps:');
    console.log('  1. Open exports/vendor-shipping-rates-TEMPLATE.csv');
    console.log('  2. Fill in the shipping_cost column for each vendor');
    console.log('  3. Save as exports/vendor-shipping-rates.csv');
    console.log('  4. Optionally create exports/tag-shipping-rates.csv for heavy/bulky items');
    
    return vendors;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  getAllVendors()
    .then(() => {
      console.log('\n✅ Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { getAllVendors };
