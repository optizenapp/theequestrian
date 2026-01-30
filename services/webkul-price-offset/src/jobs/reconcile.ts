import { initDb } from '../db';
import { loadTagRates, loadVendorRates } from '../csv/loadRates';
import { getProductById, listProducts } from '../webkul/products';
import { processProduct } from '../processor';
import { config } from '../config';

async function run() {
  await initDb();
  const vendorRates = loadVendorRates();
  const tagRates = loadTagRates();

  let page = 1;
  let processed = 0;

  while (true) {
    const products = await listProducts(page, config.pageSize);
    if (products.length === 0) break;

    for (const product of products) {
      const fullProduct = await getProductById(product.id);
      if (!fullProduct) {
        continue;
      }
      await processProduct(fullProduct, { vendorRates, tagRates }, 'reconcile');
      processed += 1;
    }

    console.log(`[Reconcile] Page ${page} processed (${processed} products).`);
    page += 1;
  }

  console.log('[Reconcile] Completed.');
}

run().catch((error) => {
  console.error('[Reconcile] Failed:', error);
  process.exit(1);
});
