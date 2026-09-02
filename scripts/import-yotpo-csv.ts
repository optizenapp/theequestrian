import { sql } from '@/lib/db/vercel-postgres';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface YotpoCSVRow {
  'Review ID': string;
  'Review Creation Date': string;
  'Review Status': string;
  'Review Score': string;
  'Review Title': string;
  'Review Content': string;
  'Reviewer Display Name': string;
  'Reviewer Email': string;
  'Product URL': string;
  'Product Handle': string;
  'Product Title': string;
  'Order ID': string;
}

async function importYotpoCSV() {
  console.log('🚀 Starting Yotpo CSV import...\n');

  // Read the CSV file
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('❌ Please provide the path to the Yotpo CSV file');
    console.error('Usage: npx tsx scripts/import-yotpo-csv.ts /path/to/csv/file.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading CSV file: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV with relaxed column count
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Allow inconsistent column counts
  });

  console.log(`📊 Found ${records.length} reviews in CSV\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of records as YotpoCSVRow[]) {
    try {
      // Skip if not published
      if (row['Review Status'] !== 'Published') {
        console.log(`⏭️  Skipping unpublished review ${row['Review ID']}`);
        skipped++;
        continue;
      }

      // Extract product handle from URL or use the handle field
      let productHandle = row['Product Handle'];
      if (!productHandle && row['Product URL']) {
        const urlParts = row['Product URL'].split('/products/');
        if (urlParts.length > 1) {
          productHandle = urlParts[1].split('?')[0];
        }
      }

      if (!productHandle) {
        console.log(`⚠️  No product handle for review ${row['Review ID']}, skipping`);
        skipped++;
        continue;
      }

      // Parse the date (format: "2025-11-22 07:02:29")
      const createdAt = new Date(row['Review Creation Date']);

      // Determine if verified purchase (has order ID)
      const verifiedPurchase = !!row['Order ID'];

      // Insert into database
      await sql`
        INSERT INTO reviews (
          product_id,
          product_handle,
          product_title,
          author_name,
          author_email,
          rating,
          title,
          content,
          status,
          verified_purchase,
          source,
          created_at
        ) VALUES (
          ${productHandle},
          ${productHandle},
          ${row['Product Title'] || 'Product'},
          ${row['Reviewer Display Name'] || 'Anonymous'},
          ${row['Reviewer Email'] || ''},
          ${parseInt(row['Review Score']) || 5},
          ${row['Review Title'] || ''},
          ${row['Review Content'] || ''},
          'approved',
          ${verifiedPurchase},
          'yotpo',
          ${createdAt.toISOString()}
        )
        ON CONFLICT DO NOTHING
      `;

      imported++;
      console.log(`✅ Imported review ${row['Review ID']} for product: ${productHandle}`);
    } catch (error) {
      errors++;
      console.error(`❌ Error importing review ${row['Review ID']}:`, error);
    }
  }

  console.log('\n📈 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${records.length}`);

  console.log('\n✨ Import complete!');
}

importYotpoCSV().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});

