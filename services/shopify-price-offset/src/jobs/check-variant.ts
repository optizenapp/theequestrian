#!/usr/bin/env tsx
import { pool } from '../db/index.js';

const VARIANT_ID = 'gid://shopify/ProductVariant/43751735230756';

(async () => {
  const result = await pool.query(`
    SELECT 
      vendor_name,
      shopify_price,
      shipping_offset,
      adjusted_price,
      last_source,
      updated_at
    FROM shopify_price_audit
    WHERE variant_id = $1
  `, [VARIANT_ID]);
  
  if (result.rows.length === 0) {
    console.log('❌ No audit record found for this variant');
    console.log('   This means the bulk script did NOT process this product');
  } else {
    const row = result.rows[0];
    console.log('📊 Audit Record:');
    console.log(`   Vendor: ${row.vendor_name}`);
    console.log(`   Original Price: $${parseFloat(row.shopify_price).toFixed(2)}`);
    console.log(`   Shipping Offset: $${row.shipping_offset ? parseFloat(row.shipping_offset).toFixed(2) : 'N/A'}`);
    console.log(`   Adjusted Price: $${row.adjusted_price ? parseFloat(row.adjusted_price).toFixed(2) : 'N/A'}`);
    console.log(`   Last Source: ${row.last_source}`);
    console.log(`   Updated: ${new Date(row.updated_at).toLocaleString()}`);
    
    if (row.shipping_offset) {
      const expected = parseFloat(row.shopify_price) + parseFloat(row.shipping_offset);
      console.log(`\n   Expected Price: $${expected.toFixed(2)}`);
      console.log(`   Current Shopify Price: $8.95`);
      
      if (Math.abs(expected - 8.95) < 0.01) {
        console.log(`   ✅ CORRECT`);
      } else {
        console.log(`   ❌ INCORRECT - Should be $${expected.toFixed(2)}`);
      }
    }
  }
  
  await pool.end();
})();
