import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

function run() {
  // Load seller mapping
  const sellerMappingPath = path.join(process.cwd(), '..', '..', 'exports', 'seller-to-vendor-mapping.csv');
  const sellerContent = fs.readFileSync(sellerMappingPath, 'utf-8');
  const sellerRecords = parse(sellerContent, { columns: true, skip_empty_lines: true, trim: true });

  // Load vendor rates
  const vendorRatesPath = path.join(process.cwd(), '..', '..', 'exports', 'vendor-shipping-rates.csv');
  const vendorContent = fs.readFileSync(vendorRatesPath, 'utf-8');
  const vendorRecords = parse(vendorContent, { columns: true, skip_empty_lines: true, trim: true });

  // Create a map of normalized vendor names
  const vendorMap = new Map<string, string>();
  for (const row of vendorRecords) {
    const vendorName = row.vendor?.trim();
    if (!vendorName) continue;
    const normalized = vendorName.toLowerCase().replace(/\s+/g, ' ').trim();
    vendorMap.set(normalized, vendorName);
  }

  console.log(`Found ${vendorMap.size} vendors in vendor-shipping-rates.csv\n`);
  console.log('Matching sellers to vendors...\n');

  const matched: string[] = [];
  const unmatched: string[] = [];

  // Update seller records with matched vendor names
  for (const seller of sellerRecords) {
    const sellerName = seller.vendor_name?.trim();
    if (!sellerName) continue;

    const normalized = sellerName.toLowerCase().replace(/\s+/g, ' ').trim();
    const exactMatch = vendorMap.get(normalized);

    if (exactMatch) {
      seller.vendor_name = exactMatch; // Update to exact match
      matched.push(`✓ ${sellerName} → ${exactMatch} (seller_id: ${seller.seller_id})`);
    } else {
      unmatched.push(`✗ ${sellerName} (seller_id: ${seller.seller_id}) - NO MATCH`);
    }
  }

  // Write updated mapping
  const csvRows = ['seller_id,vendor_name,total_products,store_name,email,active'];
  for (const seller of sellerRecords) {
    csvRows.push(
      `${seller.seller_id},${csvEscape(seller.vendor_name)},${seller.total_products},${csvEscape(seller.store_name)},${csvEscape(seller.email)},${seller.active}`
    );
  }

  fs.writeFileSync(sellerMappingPath, csvRows.join('\n') + '\n', 'utf-8');

  // Print results
  console.log('='.repeat(80));
  console.log(`\nMatched (${matched.length}):\n`);
  matched.forEach(m => console.log(m));

  if (unmatched.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\nUnmatched (${unmatched.length}):\n`);
    unmatched.forEach(u => console.log(u));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n✅ Updated ${sellerMappingPath}`);
  console.log(`\nSummary:`);
  console.log(`  - Matched: ${matched.length} sellers`);
  console.log(`  - Unmatched: ${unmatched.length} sellers`);
  console.log(`\nThe middleware will now use these exact vendor names for shipping rate lookup.`);
}

function csvEscape(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

run();
