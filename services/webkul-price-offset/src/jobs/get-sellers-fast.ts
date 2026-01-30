import fs from 'fs';
import path from 'path';
import { initDb } from '../db';
import { getAllSellers, getSellerVendorName } from '../webkul/sellers';

async function run() {
  await initDb();

  console.log('[GetSellers] Fetching all sellers from Webkul...\n');

  const sellers = await getAllSellers();

  console.log(`\n✅ Found ${sellers.length} sellers\n`);
  console.log('='.repeat(80));

  const sorted = sellers.sort((a, b) => {
    const aTotal = (a as any).total_products || 0;
    const bTotal = (b as any).total_products || 0;
    return bTotal - aTotal;
  });

  for (const seller of sorted) {
    const vendorName = getSellerVendorName(seller);
    const totalProducts = (seller as any).total_products || 0;
    
    console.log(`Seller ID: ${seller.id}`);
    console.log(`  Name: ${vendorName}`);
    console.log(`  Store: ${seller.sp_store_name || 'N/A'}`);
    console.log(`  Email: ${(seller as any).email || 'N/A'}`);
    console.log(`  Total Products: ${totalProducts}`);
    console.log(`  Active: ${(seller as any).active === '1' ? 'Yes' : 'No'}`);
    console.log('');
  }

  // Generate CSV mapping
  const csvRows = ['seller_id,vendor_name,total_products,store_name,email,active'];
  for (const seller of sorted) {
    const vendorName = getSellerVendorName(seller);
    const totalProducts = (seller as any).total_products || 0;
    const storeName = seller.sp_store_name || '';
    const email = (seller as any).email || '';
    const active = (seller as any).active === '1' ? 'Yes' : 'No';
    
    csvRows.push(
      `${seller.id},${csvEscape(vendorName)},${totalProducts},${csvEscape(storeName)},${csvEscape(email)},${active}`
    );
  }

  const outPath = path.join(process.cwd(), '..', '..', 'exports', 'seller-to-vendor-mapping.csv');
  fs.writeFileSync(outPath, csvRows.join('\n') + '\n', 'utf-8');

  console.log('='.repeat(80));
  console.log(`\n✅ Created mapping file: ${outPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review exports/seller-to-vendor-mapping.csv`);
  console.log(`  2. Update vendor_name column to match your vendor-shipping-rates.csv exactly`);
  console.log(`  3. The middleware will use this mapping to match sellers to shipping rates`);
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
