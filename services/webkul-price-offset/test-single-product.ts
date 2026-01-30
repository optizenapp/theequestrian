import dotenv from 'dotenv';
import { processProduct } from './src/processor.js';
import { getProductById } from './src/webkul/products.js';
import { loadVendorRates, loadTagRates } from './src/csv/loadRates.js';
import { loadSellerMapping } from './src/csv/sellerMapping.js';

dotenv.config();

async function main() {
  const shopifyId = '12394040';
  console.log(`\n🔍 Looking for Shopify product ID: ${shopifyId}\n`);
  
  // Search for the product by Shopify ID
  const WEBKUL_ACCESS_TOKEN = process.env.WEBKUL_ACCESS_TOKEN;
  const WEBKUL_API_URL = process.env.WEBKUL_API_BASE_URL;
  
  let page = 1;
  let found = false;
  
  while (!found && page < 10) {
    const response = await fetch(`${WEBKUL_API_URL}/api/v2/products.json?page=${page}&limit=50`, {
      headers: {
        'Authorization': `Bearer ${WEBKUL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    const products = data.products || [];
    
    if (products.length === 0) break;
    
    for (const product of products) {
      if (product.shopify_product_id === shopifyId || String(product.shopify_product_id) === shopifyId) {
        console.log(`✅ Found product!`);
        console.log(`Name: ${product.product_name}`);
        console.log(`Webkul ID: ${product.id}`);
        console.log(`Shopify ID: ${product.shopify_product_id}`);
        console.log(`Handle: ${product.handle}\n`);
        
        // Now process it
        console.log('🔄 Processing product (LIVE MODE)...\n');
        
        const vendorRates = loadVendorRates();
        const tagRates = loadTagRates();
        const sellerMapping = loadSellerMapping();
        
        const fullProduct = await getProductById(product.id);
        
        if (fullProduct.variants && fullProduct.variants.length > 0) {
          console.log(`Current price: $${fullProduct.variants[0].price}`);
          console.log(`Vendor: ${fullProduct.seller_id ? 'Will lookup...' : 'Unknown'}\n`);
        }
        
        await processProduct(fullProduct, {
          vendorRates,
          tagRates,
          sellerMapping,
        });
        
        console.log('\n✅ Product processed!\n');
        
        // Fetch again to confirm
        const updated = await getProductById(product.id);
        if (updated.variants && updated.variants.length > 0) {
          console.log(`New price: $${updated.variants[0].price}\n`);
        }
        
        found = true;
        break;
      }
    }
    
    page++;
  }
  
  if (!found) {
    console.log('❌ Product not found in Webkul');
  }
}

main().catch(console.error);
