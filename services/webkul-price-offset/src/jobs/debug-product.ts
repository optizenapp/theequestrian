import { initDb } from '../db';
import { listProducts, getProductById } from '../webkul/products';
import { config } from '../config';

async function run() {
  await initDb();

  console.log('[Debug] Fetching first page of products...\n');

  const products = await listProducts(1, 5);
  
  if (products.length === 0) {
    console.log('[Debug] No products found');
    return;
  }

  console.log(`[Debug] Found ${products.length} products\n`);
  console.log('='.repeat(80));

  for (const product of products.slice(0, 2)) {
    console.log(`\nProduct ID: ${product.id}`);
    console.log('-'.repeat(80));
    
    const fullProduct = await getProductById(product.id);
    
    if (!fullProduct) {
      console.log('Could not fetch full product');
      continue;
    }

    console.log('RAW PRODUCT JSON:');
    console.log(JSON.stringify(fullProduct, null, 2));
    console.log('='.repeat(80));
  }
}

run().catch((error) => {
  console.error('[Debug] Failed:', error);
  process.exit(1);
});
