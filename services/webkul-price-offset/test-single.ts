import dotenv from 'dotenv';

dotenv.config();

const WEBKUL_ACCESS_TOKEN = process.env.WEBKUL_ACCESS_TOKEN;
const WEBKUL_API_URL = process.env.WEBKUL_API_BASE_URL;

async function webkulFetch(path: string, options: any = {}) {
  const response = await fetch(`${WEBKUL_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${WEBKUL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webkul API ${response.status}: ${text}`);
  }
  
  return response.json();
}

async function main() {
  const webkulId = '12394040';
  console.log(`\n🔍 Fetching Webkul product ID: ${webkulId}\n`);
  
  // Get current product details
  const data = await webkulFetch(`/api/v2/products/${webkulId}.json`);
  const product = data.product;
  
  if (!product) {
    console.log('❌ Product not found');
    return;
  }
  
  console.log(`✅ Found product!`);
  console.log(`Name: ${product.product_name}`);
  console.log(`Handle: ${product.handle}`);
  console.log(`Shopify ID: ${product.shopify_product_id}`);
  console.log(`Variants: ${product.variants?.length || 0}\n`);
  
  if (product.variants && product.variants.length > 0) {
    const variant = product.variants[0];
    console.log(`Current variant price: $${variant.price}`);
    console.log(`Variant ID: ${variant.id}\n`);
  }
  
  console.log(`📋 Product details:`);
  console.log(`Seller ID: ${product.seller_id}`);
  console.log(`Tags: ${product.product_tag || 'none'}`);
  console.log(`\n🚀 Processing with bulk script...\n`);
}

main().catch(console.error);
