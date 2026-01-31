import { initDb } from '../db';
import { loadVendorRates, loadTagRates } from '../db/rates';
import { loadSellerMapping } from '../csv/loadSellerMapping';
import { getProductById, listProducts } from '../webkul/products';
import { processProduct } from '../processor';
import { config } from '../config';

const SAMPLE_SIZE = process.env.SAMPLE_SIZE ? Number(process.env.SAMPLE_SIZE) : null;

async function run() {
  await initDb();
  
  // Load rates from Postgres
  const vendorRatesMap = await loadVendorRates();
  const tagRatesMap = await loadTagRates();
  const sellerMapping = loadSellerMapping();
  
  // Convert to format expected by processProduct
  const vendorRates = new Map();
  for (const [vendor, rate] of vendorRatesMap) {
    vendorRates.set(vendor, rate);
  }
  
  const tagRates = new Map();
  for (const [tag, rate] of tagRatesMap) {
    tagRates.set(tag, rate);
  }
  
  console.log(`[Bulk] Loaded ${vendorRates.size} vendor rates`);
  console.log(`[Bulk] Loaded ${tagRates.size} tag rates`);
  console.log(`[Bulk] Loaded ${sellerMapping.size} seller mappings`);
  if (SAMPLE_SIZE) {
    console.log(`[Bulk] SAMPLE MODE: Will process ${SAMPLE_SIZE} products only`);
  }
  console.log('');

  let page = 1;
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const failedProducts: Array<{ id: string; name: string; error: string }> = [];

  while (true) {
    const products = await listProducts(page, config.pageSize);
    if (products.length === 0) break;

    for (const product of products) {
      if (SAMPLE_SIZE && processed >= SAMPLE_SIZE) {
        console.log(`\n[Bulk] ✅ Sample limit reached (${SAMPLE_SIZE} products)`);
        console.log(`Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
        if (failedProducts.length > 0) {
          console.log('\nFailed products:');
          failedProducts.forEach(p => console.log(`  - ${p.id}: ${p.name} (${p.error})`));
        }
        return;
      }
      
      const fullProduct = await getProductById(product.id);
      if (!fullProduct) {
        skipped += 1;
        continue;
      }
      
      // Only process products that are published to Shopify
      const productAny = fullProduct as any;
      if (!productAny.shopify_product_id || productAny.shopify_product_id === '0' || productAny.shopify_product_id === 0) {
        console.log(`[Bulk] Skipping unpublished product ${fullProduct.id} (no Shopify ID)`);
        skipped += 1;
        processed += 1;
        continue;
      }
      
      const productName = productAny.product_name ?? productAny.title ?? productAny.handle ?? String(fullProduct.id);
      console.log(`\n[${processed + 1}] Processing: ${productName} (ID: ${fullProduct.id}, Shopify: ${productAny.shopify_product_id})`);
      
      try {
        await processProduct(fullProduct, { vendorRates, tagRates, sellerMapping }, 'bulk');
        processed += 1;
      } catch (error: any) {
        failed += 1;
        const errorMsg = error.message || String(error);
        console.log(`[Bulk] ⚠️  Failed product ${fullProduct.id}: ${errorMsg}`);
        failedProducts.push({
          id: String(fullProduct.id),
          name: productName,
          error: errorMsg
        });
        // Continue to next product instead of stopping
      }
    }

    console.log(`[Bulk] Page ${page} processed (${processed} success, ${skipped} skipped, ${failed} failed).`);
    page += 1;
  }

  console.log('\n[Bulk] ✅ Completed.');
  console.log(`Total: ${processed} processed, ${skipped} skipped, ${failed} failed`);
  
  if (failedProducts.length > 0) {
    console.log('\n⚠️  Failed products (review these manually):');
    failedProducts.forEach(p => {
      console.log(`  - ${p.id}: ${p.name}`);
      console.log(`    Error: ${p.error}`);
    });
  }
}

run().catch((error) => {
  console.error('[Bulk] Failed:', error);
  process.exit(1);
});
