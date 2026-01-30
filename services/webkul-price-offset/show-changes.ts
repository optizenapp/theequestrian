import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(`
    SELECT 
      product_id,
      variant_id,
      vendor_name,
      vendor_price,
      adjusted_price,
      shipping_offset,
      tags,
      tag_match,
      updated_at
    FROM price_offset_audit
    WHERE updated_at > NOW() - INTERVAL '1 hour'
      AND vendor_price != adjusted_price
      AND last_source = 'bulk'
    ORDER BY updated_at DESC
    LIMIT 5
  `);
  
  console.log('\n📊 Recent Price Changes (Last Hour):\n');
  
  for (const row of result.rows) {
    console.log(`Webkul Product ID: ${row.product_id}`);
    console.log(`Webkul Variant ID: ${row.variant_id}`);
    console.log(`Vendor: ${row.vendor_name}`);
    console.log(`Original Price: $${row.vendor_price}`);
    console.log(`New Price: $${row.adjusted_price} (+ $${row.shipping_offset} offset)`);
    if (row.tag_match) console.log(`Tag Match: ${row.tag_match}`);
    console.log(`Tags: ${row.tags?.join(', ') || 'none'}`);
    console.log(`Updated: ${row.updated_at}`);
    console.log('---\n');
  }
  
  if (result.rows.length === 0) {
    console.log('No price changes found. Checking all recent updates...\n');
    
    const allUpdates = await pool.query(`
      SELECT 
        product_id,
        variant_id,
        vendor_name,
        vendor_price,
        adjusted_price,
        shipping_offset
      FROM price_offset_audit
      WHERE updated_at > NOW() - INTERVAL '1 hour'
        AND last_source = 'bulk'
      ORDER BY updated_at DESC
      LIMIT 3
    `);
    
    console.log('Recent bulk updates (including no-change):', allUpdates.rows);
  }
  
  await pool.end();
}

main().catch(console.error);
