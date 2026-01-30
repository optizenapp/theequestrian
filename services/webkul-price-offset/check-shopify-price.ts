import dotenv from 'dotenv';

dotenv.config();

const WEBKUL_ACCESS_TOKEN = process.env.WEBKUL_ACCESS_TOKEN;
const WEBKUL_API_URL = process.env.WEBKUL_API_BASE_URL;

async function main() {
  const webkulId = '10567214';
  
  const response = await fetch(`${WEBKUL_API_URL}/api/v2/products/${webkulId}.json`, {
    headers: {
      'Authorization': `Bearer ${WEBKUL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  const product = data.product;
  
  console.log('\n📊 Current Webkul/Shopify Prices:\n');
  console.log(`Product: ${product.product_name}`);
  console.log(`Webkul ID: ${product.id}`);
  console.log(`Shopify ID: ${product.shopify_product_id}`);
  console.log(`Handle: ${product.handle}`);
  
  if (product.variants && product.variants.length > 0) {
    console.log(`\nVariant Price in Webkul: $${product.variants[0].price}`);
    console.log(`Compare At Price: $${product.variants[0].compare_at_price || 'none'}`);
  }
  
  console.log(`\n✅ This price ($${product.variants[0].price}) is what Shopify sees`);
  console.log(`📱 Frontend is ALSO adding +$12 shipping on top of this`);
  console.log(`💰 So customers see: $${product.variants[0].price} + $12 = $${(parseFloat(product.variants[0].price) + 12).toFixed(2)}`);
}

main().catch(console.error);
