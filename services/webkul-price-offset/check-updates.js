require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(`
    SELECT 
      product_id,
      COUNT(*) as variant_count,
      MAX(updated_at) as last_updated,
      STRING_AGG(DISTINCT vendor_name, ', ') as vendors,
      SUM(CASE WHEN shipping_offset > 0 THEN 1 ELSE 0 END) as offset_applied
    FROM price_offset_audit
    WHERE updated_at > NOW() - INTERVAL '10 minutes'
      AND last_source = 'bulk'
    GROUP BY product_id
    ORDER BY last_updated DESC
  `);
  
  console.log('\n📊 Recent Bulk Updates (last 10 minutes):\n');
  console.log(`Total products: ${result.rows.length}`);
  console.log(`Total variants: ${result.rows.reduce((sum, r) => sum + parseInt(r.variant_count), 0)}\n`);
  
  for (const row of result.rows) {
    console.log(`Product ${row.product_id}:`);
    console.log(`  Vendor: ${row.vendors}`);
    console.log(`  Variants: ${row.variant_count}`);
    console.log(`  With offset: ${row.offset_applied}`);
    console.log(`  Updated: ${row.last_updated}\n`);
  }
  
  await pool.end();
}

main().catch(console.error);
