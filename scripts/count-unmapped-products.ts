import 'dotenv/config';
import { getAllProducts, getProductCanonicalUrls } from '@/lib/shopify/products';

async function run() {
  const products = await getAllProducts();
  if (products.length === 0) {
    console.log('No products returned from Shopify.');
    return;
  }

  const canonicalMap = await getProductCanonicalUrls(
    products.map((product) => ({
      id: product.id,
      handle: product.handle,
      productType: product.productType,
      metafield: product.metafield,
    }))
  );

  const unmapped = products.filter((product) => {
    const canonical = canonicalMap.get(product.id) || '';
    return canonical.startsWith('/products/');
  });

  const mappedCount = products.length - unmapped.length;

  console.log(`Total products: ${products.length}`);
  console.log(`Mapped to category: ${mappedCount}`);
  console.log(`Unmapped (fallback /products): ${unmapped.length}`);

  if (unmapped.length > 0) {
    console.log('\nSample unmapped handles:');
    unmapped.slice(0, 20).forEach((product) => {
      console.log(`- ${product.handle} (${product.productType || 'no productType'})`);
    });
  }
}

run().catch((error) => {
  console.error('Count unmapped products failed:', error);
  process.exit(1);
});
