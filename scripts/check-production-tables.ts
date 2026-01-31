#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const PROD_URL = "postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(PROD_URL);

async function checkTables() {
  console.log('🔍 Checking production database tables...\n');

  // Check collection_content
  try {
    const contentCount = await sql`SELECT COUNT(*) as count FROM collection_content`;
    console.log(`✅ collection_content: ${contentCount[0].count} rows`);
    
    // Sample a few rows
    const sample = await sql`SELECT category, subcategory, subsubcategory, h1_title FROM collection_content LIMIT 3`;
    console.log('   Sample rows:');
    sample.forEach(row => {
      console.log(`   - ${row.category}/${row.subcategory || ''}/${row.subsubcategory || ''}: "${row.h1_title}"`);
    });
  } catch (error: any) {
    console.log(`❌ collection_content: ${error.message}`);
  }

  console.log('');

  // Check collection_mapping
  try {
    const mappingCount = await sql`SELECT COUNT(*) as count FROM collection_mapping`;
    console.log(`✅ collection_mapping: ${mappingCount[0].count} rows`);
    
    // Sample a few rows
    const sample = await sql`SELECT category, subcategory, subsubcategory, product_type FROM collection_mapping LIMIT 3`;
    console.log('   Sample rows:');
    sample.forEach(row => {
      console.log(`   - ${row.category}/${row.subcategory || ''}/${row.subsubcategory || ''}: "${row.product_type}"`);
    });
  } catch (error: any) {
    console.log(`❌ collection_mapping: ${error.message}`);
  }

  console.log('');

  // Check vendor_shipping_rates
  try {
    const ratesCount = await sql`SELECT COUNT(*) as count FROM vendor_shipping_rates`;
    console.log(`✅ vendor_shipping_rates: ${ratesCount[0].count} rows`);
    
    // Sample a few rows
    const sample = await sql`SELECT vendor_name, base_rate FROM vendor_shipping_rates LIMIT 3`;
    console.log('   Sample rows:');
    sample.forEach(row => {
      console.log(`   - ${row.vendor_name}: $${row.base_rate}`);
    });
  } catch (error: any) {
    console.log(`❌ vendor_shipping_rates: ${error.message}`);
  }
}

checkTables().catch(console.error);
