import { processProduct } from './src/processor.js';
import { getProductById } from './src/webkul/products.js';
import { loadVendorRates, loadTagRates } from './src/csv/loadRates.js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();

function loadSellerMapping() {
  const csvPath = path.resolve(process.cwd(), '../../public/seller-to-vendor-mapping.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
  
  const map = new Map<string, string>();
  for (const row of records) {
    const sellerId = String(row.seller_id || row.id || '').trim();
    const vendorName = String(row.vendor_name || row.vendor || '').trim();
    if (sellerId && vendorName) {
      map.set(sellerId, vendorName);
    }
  }
  return map;
}

async function main() {
  const webkulId = '10567214';
  
  console.log('\n🔍 Fetching product details...\n');
  
  const product = await getProductById(webkulId);
  
  if (!product) {
    console.log('❌ Product not found');
    return;
  }

  const productAny = product as any;
  console.log(`✅ Found: ${productAny.product_name ?? productAny.title ?? productAny.handle}`);
  console.log(`Handle: ${productAny.handle ?? 'unknown'}`);
  console.log(`Shopify ID: ${productAny.shopify_product_id ?? 'unknown'}`);
  console.log(`Seller ID: ${productAny.seller_id ?? 'unknown'}`);
  console.log(`Tags: ${productAny.product_tag || 'none'}`);
  console.log(`Variants: ${productAny.variants?.length || 0}`);
  
  if (productAny.variants && productAny.variants.length > 0) {
    console.log(`\nCurrent Price: $${productAny.variants[0].price}\n`);
  }
  
  console.log('🔄 LIVE UPDATE - Processing...\n');
  
  const vendorRates = loadVendorRates();
  const tagRates = loadTagRates();
  const sellerMapping = loadSellerMapping();
  
  await processProduct(product, {
    vendorRates,
    tagRates,
    sellerMapping,
  }, 'manual');
  
  console.log('\n✅ Done! Fetching updated product...\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const updated = await getProductById(webkulId);
  
  if (updated && (updated as any).variants && (updated as any).variants.length > 0) {
    console.log(`New Price: $${(updated as any).variants[0].price}\n`);
  }
}

main().catch(console.error);
