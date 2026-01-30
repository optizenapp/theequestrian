import { initDb, pool } from '../db';
import { getProductById, updateVariantPrice } from '../webkul/products';

async function run() {
  await initDb();

  const result = await pool.query(
    `
      SELECT DISTINCT product_id
      FROM price_offset_audit
      WHERE adjusted_price IS NOT NULL
      ORDER BY product_id
    `
  );

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
      
      // Fetch full product to get variant details
      const product = await getProductById(productId);
      if (!product || !product.variants) {
        console.warn(`[Rollback] Product ${productId} not found, skipping`);
        continue;
      }

      // Get original prices from audit
      const auditResult = await pool.query(
        `SELECT variant_id, vendor_price, vendor_compare_at
         FROM price_offset_audit
         WHERE product_id = $1 AND adjusted_price IS NOT NULL
         ORDER BY updated_at DESC`,
        [productId]
      );

      const auditMap = new Map();
      for (const audit of auditResult.rows) {
        auditMap.set(String(audit.variant_id), {
          vendorPrice: audit.vendor_price,
          vendorCompareAt: audit.vendor_compare_at
        });
      }

      // Rollback each variant
      for (const variant of product.variants) {
        const audit = auditMap.get(String(variant.id));
        if (!audit || audit.vendorPrice === null) {
          continue;
        }

        await updateVariantPrice(
          productId,
          variant.id,
          Number(audit.vendorPrice).toFixed(2),
          audit.vendorCompareAt !== null ? Number(audit.vendorCompareAt).toFixed(2) : undefined,
          variant // Pass full variant object for API compatibility
        );
      }

      processed++;
      console.log(`[Rollback] Product ${productId} complete`);
      
    } catch (error: any) {
      failed++;
      console.error(`[Rollback] Failed to rollback product ${productId}:`, error.message);
      // Continue to next product instead of stopping
    }
  }

  console.log(`\n[Rollback] ✅ Completed.`);
  console.log(`Total: ${processed} products rolled back, ${failed} failed`);
}

run().catch((error) => {
  console.error('[Rollback] Failed:', error);
  process.exit(1);
});
