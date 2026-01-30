import dotenv from 'dotenv';

dotenv.config();

const WEBKUL_ACCESS_TOKEN = process.env.WEBKUL_ACCESS_TOKEN;
const WEBKUL_API_URL = process.env.WEBKUL_API_BASE_URL;

async function getProduct(webkulId: string) {
  const response = await fetch(`${WEBKUL_API_URL}/api/v2/products/${webkulId}.json`, {
    headers: {
      'Authorization': `Bearer ${WEBKUL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data.product || null;
}

async function main() {
  console.log('\n🔍 Product Details for Frontend Testing:\n');
  
  const products = [
    { webkul: '21250875', name: 'Heavenly Wings Keepsake Memorial Necklace', oldPrice: 199.90, newPrice: 207.90 },
    { webkul: '21222509', name: 'Tanami Loop On Girth Points Brown', oldPrice: 24.95, newPrice: 39.95 }
  ];
  
  for (const p of products) {
    try {
      const product = await getProduct(p.webkul);
      if (!product) {
        console.log(`⚠️ Product not found: ${p.name}`);
        continue;
      }
      
      console.log(`Product: ${p.name}`);
      console.log(`Webkul ID: ${p.webkul}`);
      console.log(`Shopify ID: ${product.shopify_product_id}`);
      console.log(`Handle: ${product.handle}`);
      console.log(`Price Change: $${p.oldPrice} → $${p.newPrice}`);
      console.log(`Frontend URL: https://theequestrian.vercel.app/products/${product.handle}`);
      console.log('---\n');
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.log(`Error fetching ${p.name}:`, err);
    }
  }
}

main().catch(console.error);
