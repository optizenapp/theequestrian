#!/usr/bin/env tsx
/**
 * Migrate Collection Mapping from CSV to Postgres
 * 
 * This script:
 * 1. Reads existing mapping-template-draft2.csv
 * 2. Parses all rows
 * 3. Inserts into collection_mapping table
 * 4. Handles duplicates with ON CONFLICT
 * 5. Logs migration stats
 * 
 * Run: npm run mapping:migrate
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

// Create SQL client directly
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Missing POSTGRES_URL or DATABASE_URL');
  process.exit(1);
}
const sql = neon(connectionString);

interface MappingCsvRow {
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
  action: string;
  merge_to: string;
  notes: string;
}

async function migrateMappingToPostgres() {
  console.log('🚀 Starting mapping CSV to Postgres migration...\n');

  const csvPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  try {
    // Read and parse CSV
    console.log('📄 Reading CSV file...');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as MappingCsvRow[];

    console.log(`✅ Found ${rows.length} rows in CSV\n`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Insert each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Skip rows with missing required fields
        if (!row.top_level || !row.product_type || !row.action) {
          console.warn(`⚠️  Skipping row ${i + 1}: missing required fields`);
          skipped++;
          continue;
        }

        // Normalize empty strings to null
        const topLevel = row.top_level?.trim() || null;
        const parentCategory = row.parent_category?.trim() || null;
        const subcategoryHandle = row.subcategory_handle?.trim() || null;
        const productType = row.product_type?.trim();
        const action = row.action?.trim();
        const mergeTo = row.merge_to?.trim() || null;
        const notes = row.notes?.trim() || null;

        if (!topLevel || !productType || !action) {
          console.warn(`⚠️  Skipping row ${i + 1}: invalid data after normalization`);
          skipped++;
          continue;
        }

        // Insert into database with conflict handling
        const result = await sql`
          INSERT INTO collection_mapping (
            top_level,
            parent_category,
            subcategory_handle,
            product_type,
            action,
            merge_to,
            notes
          ) VALUES (
            ${topLevel},
            ${parentCategory},
            ${subcategoryHandle},
            ${productType},
            ${action},
            ${mergeTo},
            ${notes}
          )
          ON CONFLICT (top_level, parent_category, subcategory_handle, product_type)
          DO UPDATE SET
            action = EXCLUDED.action,
            merge_to = EXCLUDED.merge_to,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        // Check if it was an insert or update
        if (result[0].inserted) {
          inserted++;
        } else {
          updated++;
        }

        // Progress update every 100 rows
        if ((i + 1) % 100 === 0) {
          console.log(`📊 Progress: ${i + 1}/${rows.length} rows processed...`);
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error processing row ${i + 1}:`, error);
        console.error(`   Data:`, JSON.stringify(row));
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`📊 Stats:`);
    console.log(`   - Total rows in CSV: ${rows.length}`);
    console.log(`   - Inserted (new): ${inserted}`);
    console.log(`   - Updated (existing): ${updated}`);
    console.log(`   - Skipped (invalid): ${skipped}`);
    console.log(`   - Errors: ${errors}`);

    // Verify data in database
    console.log('\n🔍 Verifying database...');
    const count = await sql`SELECT COUNT(*) as count FROM collection_mapping`;
    console.log(`✅ Total rows in database: ${count[0].count}`);

    // Show breakdown by action
    const actionBreakdown = await sql`
      SELECT action, COUNT(*) as count
      FROM collection_mapping
      GROUP BY action
      ORDER BY action
    `;

    console.log('\n📊 Breakdown by action:');
    actionBreakdown.forEach((row: any) => {
      console.log(`   - ${row.action}: ${row.count}`);
    });

    // Show breakdown by top_level
    const categoryBreakdown = await sql`
      SELECT top_level, COUNT(*) as count
      FROM collection_mapping
      GROUP BY top_level
      ORDER BY count DESC
    `;

    console.log('\n📊 Breakdown by category:');
    categoryBreakdown.forEach((row: any) => {
      console.log(`   - ${row.top_level}: ${row.count}`);
    });

    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run mapping:audit (to check for problematic merge rules)');
    console.log('   2. Run: npm run mapping:fix (to apply fixes)');
    console.log('   3. Update code to read from database');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateMappingToPostgres()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
