import fs from 'fs';
import path from 'path';
import { initDb } from '../db';
import { listProducts, getProductById } from '../webkul/products';
import { config } from '../config';

interface VendorStats {
  vendor: string;
  productCount: number;
  sampleProducts: string[];
}

async function run() {
  await initDb();

  const vendorMap = new Map<string, VendorStats>();
  let page = 1;
  let totalProducts = 0;

  console.log('[Extract] Fetching products from Webkul...');

  while (true) {
    const products = await listProducts(page, config.pageSize);
    if (products.length === 0) break;

    for (const product of products) {
      const fullProduct = await getProductById(product.id);
      if (!fullProduct) continue;

      const vendor = fullProduct.brand_name || fullProduct.vendor || '(no vendor)';
      
      if (!vendorMap.has(vendor)) {
        vendorMap.set(vendor, {
          vendor,
          productCount: 0,
          sampleProducts: [],
        });
      }

      const stats = vendorMap.get(vendor)!;
      stats.productCount += 1;
      
      if (stats.sampleProducts.length < 3) {
        stats.sampleProducts.push(fullProduct.name || `Product ${fullProduct.id}`);
      }

      totalProducts += 1;
    }

    console.log(`[Extract] Processed page ${page}, total products: ${totalProducts}`);
    page += 1;
  }

  // Sort by product count descending
  const sorted = Array.from(vendorMap.values()).sort(
    (a, b) => b.productCount - a.productCount
  );

  // Generate CSV
  const csvRows: string[] = [];
  csvRows.push('vendor,shipping_cost,notes,product_count,sample_products');

  for (const stats of sorted) {
    csvRows.push(
      [
        csvEscape(stats.vendor),
        '0.00', // Default - needs manual config
        `"${stats.productCount} products"`,
        stats.productCount,
        csvEscape(stats.sampleProducts.join(' | ')),
      ].join(',')
    );
  }

  const outPath = path.join(process.cwd(), 'outputs', `vendor-rates-template-${Date.now()}.csv`);
  fs.writeFileSync(outPath, csvRows.join('\n') + '\n', 'utf-8');

  console.log(`\n[Extract] Summary:`);
  console.log(`  Total products: ${totalProducts}`);
  console.log(`  Unique vendors: ${vendorMap.size}`);
  console.log(`  Output: ${outPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open ${path.basename(outPath)}`);
  console.log(`  2. Set shipping_cost for each vendor (currently 0.00)`);
  console.log(`  3. Copy to ../../exports/vendor-shipping-rates.csv`);
}

function csvEscape(value: string | number) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

run().catch((error) => {
  console.error('[Extract] Failed:', error);
  process.exit(1);
});
