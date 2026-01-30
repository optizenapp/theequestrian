import { initDb, pool } from '../db/index.js';
import { updateVariantPrice } from '../shopify/client.js';

async function run() {
  console.log('\n🔄 Shopify Price Offset - Rollback\n');
  
  await initDb();

  const result = await pool.query(`
    SELECT DISTINCT product_id
    FROM shopify_price_audit
    WHERE adjusted_price IS NOT NULL
    ORDER BY product_id
  `);

  if (result.rowCount === 0) {
    console.log('[Rollback] No adjusted prices found.');
    return;
  }

  console.log(`[Rollback] Reverting prices for ${result.rowCount} products...`);

  let processed = 0;
  let failed = 0;

  for (const row of result.rows) {
    const productId = row.product_id;

    try {
      console.log(`\n[${processed + 1}/${result.rowCount}] Rolling back product ${productId}...`);

      // Get all variants for this product from audit
      const auditResult = await pool.query(
        `SELECT variant_id, shopify_price, shopify_compare_at
         FROM shopify_price_audit
         WHERE product_id = $1 AND adjusted_price IS NOT NULL
         ORDER BY updated_at DESC`,
        [productId]
      );

      // Rollback each variant to original Shopify price
      for (const audit of auditResult.rows) {
        await updateVariantPrice(
          audit.variant_id,
          Number(audit.shopify_price).toFixed(2),
          audit.shopify_compare_at !== null ? Number(audit.shopify_compare_at).toFixed(2) : null
        );
        console.log(`  ✓ Variant ${audit.variant_id}: Reverted to $${audit.shopify_price}`);
      }

      processed++;
      console.log(`[Rollback] Product ${productId} complete`);

    } catch (error: any) {
      failed++;
      console.error(`[Rollback] Failed to rollback product ${productId}:`, error.message);
    }
  }

  console.log(`\n[Rollback] ✅ Completed.`);
  console.log(`Total: ${processed} products rolled back, ${failed} failed`);
}

run().catch((error) => {
  console.error('[Rollback] Failed:', error);
  process.exit(1);
});
