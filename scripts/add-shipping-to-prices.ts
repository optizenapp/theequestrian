/**
 * Add Vendor Shipping Costs to Product Prices
 * 
 * This script:
 * 1. Reads a Shopify product export CSV
 * 2. Reads vendor shipping rates from vendor-shipping-rates.csv
 * 3. Adds shipping cost to each product's price
 * 4. Outputs a new CSV ready to import back to Shopify
 * 
 * Usage:
 *   npx tsx scripts/add-shipping-to-prices.ts input.csv output.csv
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import path from 'path';

interface ShopifyProductRow {
  Handle: string;
  Title: string;
  Vendor: string;
  'Variant Price': string;
  'Variant Compare At Price'?: string;
  [key: string]: any; // Other Shopify columns
}

interface VendorShippingRate {
  vendor: string;
  shipping_cost: string;
}

async function addShippingToPrices(inputFile: string, outputFile: string) {
  console.log('🚀 Starting price update process...\n');

  // 1. Read vendor shipping rates
  console.log('📦 Loading vendor shipping rates...');
  const shippingRatesPath = path.join(process.cwd(), 'exports', 'vendor-shipping-rates.csv');
  
  if (!fs.existsSync(shippingRatesPath)) {
    console.error('❌ Error: vendor-shipping-rates.csv not found in exports/');
    console.log('Please create exports/vendor-shipping-rates.csv with columns: vendor,shipping_cost');
    process.exit(1);
  }

  const shippingRatesContent = fs.readFileSync(shippingRatesPath, 'utf-8');
  const shippingRates = parse(shippingRatesContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as VendorShippingRate[];

  // Build vendor -> shipping cost map (case-insensitive)
  const shippingMap = new Map<string, number>();
  shippingRates.forEach(rate => {
    const vendor = rate.vendor.trim().toLowerCase();
    const cost = parseFloat(rate.shipping_cost);
    if (!isNaN(cost)) {
      shippingMap.set(vendor, cost);
    }
  });

  console.log(`✅ Loaded ${shippingMap.size} vendor shipping rates\n`);

  // 2. Read Shopify product export
  console.log(`📥 Reading product export: ${inputFile}`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const productsContent = fs.readFileSync(inputFile, 'utf-8');
  const products = parse(productsContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ShopifyProductRow[];

  console.log(`✅ Loaded ${products.length} product rows\n`);

  // 3. Update prices
  console.log('💰 Calculating new prices...');
  let updatedCount = 0;
  let skippedCount = 0;
  let noShippingRateCount = 0;

  const updatedProducts = products.map((product, index) => {
    const vendor = product.Vendor?.trim().toLowerCase();
    
    if (!vendor) {
      skippedCount++;
      return product;
    }

    const shippingCost = shippingMap.get(vendor);
    
    if (shippingCost === undefined) {
      noShippingRateCount++;
      console.log(`⚠️  No shipping rate for vendor: "${product.Vendor}" (row ${index + 2})`);
      return product;
    }

    // Parse current price
    const currentPrice = parseFloat(product['Variant Price']);
    
    if (isNaN(currentPrice)) {
      skippedCount++;
      return product;
    }

    // Calculate new price
    const newPrice = currentPrice + shippingCost;
    
    // Update the product row
    const updatedProduct = {
      ...product,
      'Variant Price': newPrice.toFixed(2),
    };

    // If there's a compare-at price, update it too
    if (product['Variant Compare At Price']) {
      const currentComparePrice = parseFloat(product['Variant Compare At Price']);
      if (!isNaN(currentComparePrice)) {
        updatedProduct['Variant Compare At Price'] = (currentComparePrice + shippingCost).toFixed(2);
      }
    }

    updatedCount++;
    
    // Log first few updates as examples
    if (updatedCount <= 5) {
      console.log(`  ✓ ${product.Title}: $${currentPrice.toFixed(2)} + $${shippingCost.toFixed(2)} = $${newPrice.toFixed(2)}`);
    }

    return updatedProduct;
  });

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updatedCount} products`);
  console.log(`   ⚠️  No shipping rate: ${noShippingRateCount} products`);
  console.log(`   ⏭️  Skipped: ${skippedCount} products`);

  // 4. Write output CSV
  console.log(`\n💾 Writing updated CSV: ${outputFile}`);
  const outputCsv = stringify(updatedProducts, { header: true });
  fs.writeFileSync(outputFile, outputCsv, 'utf-8');

  console.log(`\n✅ Done! Import ${outputFile} back to Shopify to update prices.`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review ${outputFile} to verify prices look correct`);
  console.log(`   2. In Shopify Admin: Products → Import`);
  console.log(`   3. Upload ${outputFile}`);
  console.log(`   4. Select "Overwrite existing products" option`);
  console.log(`   5. Import!`);
}

// CLI usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/add-shipping-to-prices.ts <input.csv> <output.csv>');
  console.log('');
  console.log('Example:');
  console.log('  npx tsx scripts/add-shipping-to-prices.ts shopify-export.csv shopify-import-updated.csv');
  process.exit(1);
}

const [inputFile, outputFile] = args;
addShippingToPrices(inputFile, outputFile);
