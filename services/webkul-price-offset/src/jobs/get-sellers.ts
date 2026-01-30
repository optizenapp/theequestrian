import fs from 'fs';
import path from 'path';
import { initDb } from '../db';
import { listProducts, getProductById } from '../webkul/products';
import { getSellerById, getSellerVendorName } from '../webkul/sellers';
import { config } from '../config';

async function run() {
  await initDb();

  const sellerMap = new Map<string, { 
    sellerId: string; 
    sellerName: string;
    productCount: number; 
    sampleProduct: string;
  }>();
  
  let page = 1;

  console.log('[GetSellers] Scanning products to find unique seller IDs...\n');

  // Scan through pages to collect seller IDs
  // Stop early if we haven't found new sellers in the last 3 pages
  let pagesWithoutNewSellers = 0;
  const maxPagesWithoutNewSellers = 3;
  
  while (page <= 20) { // Limit to 20 pages for safety
    const beforeCount = sellerMap.size;
    const products = await listProducts(page, config.pageSize);
    if (products.length === 0) break;

    for (const product of products) {
      const fullProduct = await getProductById(product.id);
      if (!fullProduct || !fullProduct.seller_id) continue;

      const sellerId = String(fullProduct.seller_id);

      if (!sellerMap.has(sellerId)) {
        console.log(`[GetSellers] Fetching seller info for seller_id: ${sellerId}...`);
        const seller = await getSellerById(sellerId);
        const sellerName = seller ? getSellerVendorName(seller) : `Unknown (${sellerId})`;
        
        sellerMap.set(sellerId, {
          sellerId,
          sellerName,
          productCount: 0,
          sampleProduct: (fullProduct as any).product_name || `Product ${fullProduct.id}`,
        });
      }

      const seller = sellerMap.get(sellerId)!;
      seller.productCount += 1;
    }

    const afterCount = sellerMap.size;
    
    if (afterCount === beforeCount) {
      pagesWithoutNewSellers += 1;
    } else {
      pagesWithoutNewSellers = 0;
    }
    
    console.log(`[GetSellers] Scanned page ${page}, found ${sellerMap.size} unique sellers so far`);
    
    // Stop if we haven't found new sellers recently
    if (pagesWithoutNewSellers >= maxPagesWithoutNewSellers) {
      console.log(`[GetSellers] No new sellers found in last ${maxPagesWithoutNewSellers} pages, stopping scan`);
      break;
    }
    
    page += 1;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nFound ${sellerMap.size} unique sellers:\n`);

  const sorted = Array.from(sellerMap.values()).sort((a, b) => b.productCount - a.productCount);

  for (const seller of sorted) {
    console.log(`Seller ID: ${seller.sellerId}`);
    console.log(`  Name: ${seller.sellerName}`);
    console.log(`  Products: ${seller.productCount}`);
    console.log(`  Sample: ${seller.sampleProduct}`);
    console.log('');
  }

  // Generate CSV mapping
  const csvRows = ['seller_id,vendor_name,product_count,notes'];
  for (const seller of sorted) {
    csvRows.push(`${seller.sellerId},${csvEscape(seller.sellerName)},${seller.productCount},Auto-generated from Webkul`);
  }

  const outPath = path.join(process.cwd(), '..', '..', 'exports', 'seller-to-vendor-mapping.csv');
  fs.writeFileSync(outPath, csvRows.join('\n') + '\n', 'utf-8');

  console.log('='.repeat(80));
  console.log(`\n✅ Created mapping file: ${outPath}`);
  console.log('\nNext steps:');
  console.log('  1. Review exports/seller-to-vendor-mapping.csv');
  console.log('  2. Update vendor_name column to match your vendor-shipping-rates.csv exactly');
  console.log('  3. The middleware will use this mapping to match sellers to shipping rates');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

run().catch((error) => {
  console.error('[GetSellers] Failed:', error);
  process.exit(1);
});
