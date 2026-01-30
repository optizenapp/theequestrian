import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const productId = '21215100';
  
  console.log('\n📊 Price History for Product 21215100\n');
  
  const result = await pool.query(`
    SELECT 
      variant_id,
      vendor_name,
      vendor_price,
      adjusted_price,
      shipping_offset,
      tag_match,
      updated_at,
      last_source
    FROM price_offset_audit
    WHERE product_id = $1
    ORDER BY updated_at DESC
    LIMIT 20
  `, [productId]);
  
  if (result.rows.length === 0) {
    console.log('No audit records found for this product');
    return;
  }
  
  console.log(`Total audit records: ${result.rows.length}\n`);
  
  // Group by variant to show history
  const variantMap = new Map();
  for (const row of result.rows) {
    if (!variantMap.has(row.variant_id)) {
      variantMap.set(row.variant_id, []);
    }
    variantMap.get(row.variant_id).push(row);
  }
  
  for (const [variantId, records] of variantMap.entries()) {
    console.log(`Variant ${variantId}:`);
    
    // Show oldest (original) and newest (current) prices
    const oldest = records[records.length - 1];
    const newest = records[0];
    
    console.log(`  Vendor: ${newest.vendor_name || 'Unknown'}`);
    console.log(`  Original Price: $${oldest.vendor_price}`);
    console.log(`  Current Price: $${newest.adjusted_price}`);
    console.log(`  Shipping Offset: $${newest.shipping_offset}`);
    if (newest.tag_match) console.log(`  Tag Match: ${newest.tag_match}`);
    console.log(`  Last Updated: ${newest.updated_at}`);
    console.log(`  Source: ${newest.last_source}`);
    console.log();
  }
  
  await pool.end();
}

main().catch(console.error);
