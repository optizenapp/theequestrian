#!/usr/bin/env tsx
/**
 * Migrate Collection Content from CSV to Postgres
 * 
 * This script:
 * 1. Reads existing collection-content.csv
 * 2. Parses all rows
 * 3. Inserts into collection_content table as backup
 * 4. Logs migration stats
 * 
 * Run: npm run content:migrate
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

interface CsvRow {
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  parent_url: string;
  category_level: string;
  status: string;
  default_sort: string;
  faq_json: string;
  related_categories_json: string;
}

async function migrateCsvToPostgres() {
  console.log('🚀 Starting CSV to Postgres migration...\n');

  const csvPath = path.join(process.cwd(), 'exports', 'collection-content.csv');

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
    }) as CsvRow[];

    console.log(`✅ Found ${rows.length} rows in CSV\n`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // Insert each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Parse JSON fields
        let faqItems = [];
        let relatedCategories = [];

        try {
          if (row.faq_json) faqItems = JSON.parse(row.faq_json);
        } catch (e) {
          console.warn(`⚠️  Failed to parse FAQ JSON for ${row.url_path}`);
        }

        try {
          if (row.related_categories_json) relatedCategories = JSON.parse(row.related_categories_json);
        } catch (e) {
          console.warn(`⚠️  Failed to parse related categories JSON for ${row.url_path}`);
        }

        // Insert into database
        await sql`
          INSERT INTO collection_content (
            url_path,
            h1_title,
            meta_title,
            meta_description,
            short_description,
            long_description,
            breadcrumb_label,
            parent_url,
            category_level,
            status,
            default_sort,
            faq_items,
            related_categories,
            generated_by
          ) VALUES (
            ${row.url_path},
            ${row.h1_title},
            ${row.meta_title || null},
            ${row.meta_description || null},
            ${row.short_description || null},
            ${row.long_description || null},
            ${row.breadcrumb_label || null},
            ${row.parent_url || null},
            ${parseInt(row.category_level, 10) || 1},
            ${row.status || 'published'},
            ${row.default_sort || 'best-selling'},
            ${JSON.stringify(faqItems)}::jsonb,
            ${JSON.stringify(relatedCategories)}::jsonb,
            'csv-migration'
          )
          ON CONFLICT (url_path) DO UPDATE SET
            h1_title = EXCLUDED.h1_title,
            meta_title = EXCLUDED.meta_title,
            meta_description = EXCLUDED.meta_description,
            short_description = EXCLUDED.short_description,
            long_description = EXCLUDED.long_description,
            breadcrumb_label = EXCLUDED.breadcrumb_label,
            parent_url = EXCLUDED.parent_url,
            category_level = EXCLUDED.category_level,
            status = EXCLUDED.status,
            default_sort = EXCLUDED.default_sort,
            faq_items = EXCLUDED.faq_items,
            related_categories = EXCLUDED.related_categories,
            updated_at = NOW()
        `;

        inserted++;

        // Progress update every 50 rows
        if ((i + 1) % 50 === 0) {
          console.log(`📊 Progress: ${i + 1}/${rows.length} rows processed...`);
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error inserting ${row.url_path}:`, error);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`📊 Stats:`);
    console.log(`   - Total rows: ${rows.length}`);
    console.log(`   - Inserted/Updated: ${inserted}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Errors: ${errors}`);

    // Verify data in database
    console.log('\n🔍 Verifying database...');
    const count = await sql`SELECT COUNT(*) as count FROM collection_content WHERE generated_by = 'csv-migration'`;
    console.log(`✅ Found ${count[0].count} rows in database with generated_by = 'csv-migration'`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateCsvToPostgres()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
