/**
 * Migrate Mega Menu Content from CSV to Database
 * 
 * Creates mega_menu_content table and imports data from CSV
 */

import 'dotenv/config';
import { sql } from '@/lib/db/vercel-postgres';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function createTable() {
  console.log('📦 Creating mega_menu_content table...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS mega_menu_content (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50) UNIQUE NOT NULL,
      featured_image_url TEXT,
      featured_title VARCHAR(255),
      featured_subtitle VARCHAR(255),
      featured_link VARCHAR(255),
      quick_links JSONB DEFAULT '[]',
      subcategory_cards JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  
  console.log('✅ Table created');
}

async function importFromCSV() {
  console.log('📥 Importing data from CSV...');
  
  const csvPath = path.join(process.cwd(), 'exports', 'mega-menu-content.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    return;
  }
  
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;
  
  console.log(`📝 Found ${records.length} records in CSV`);
  
  for (const row of records) {
    // Build quick links array
    const quickLinks = [];
    if (row.quick_link_1_title && row.quick_link_1_image_url && row.quick_link_1_link) {
      quickLinks.push({
        title: row.quick_link_1_title,
        imageUrl: row.quick_link_1_image_url,
        link: row.quick_link_1_link,
      });
    }
    if (row.quick_link_2_title && row.quick_link_2_image_url && row.quick_link_2_link) {
      quickLinks.push({
        title: row.quick_link_2_title,
        imageUrl: row.quick_link_2_image_url,
        link: row.quick_link_2_link,
      });
    }
    
    // Build subcategory cards array
    const subcategoryCards = [];
    for (let i = 1; i <= 6; i++) {
      const titleKey = `card_${i}_title`;
      const imageKey = `card_${i}_image_url`;
      const linkKey = `card_${i}_link`;
      
      if (row[titleKey] && row[imageKey] && row[linkKey]) {
        subcategoryCards.push({
          title: row[titleKey],
          imageUrl: row[imageKey],
          link: row[linkKey],
        });
      }
    }
    
    try {
      await sql`
        INSERT INTO mega_menu_content (
          category,
          featured_image_url,
          featured_title,
          featured_subtitle,
          featured_link,
          quick_links,
          subcategory_cards
        ) VALUES (
          ${row.category},
          ${row.featured_image_url || null},
          ${row.featured_title || null},
          ${row.featured_subtitle || null},
          ${row.featured_link || null},
          ${JSON.stringify(quickLinks)},
          ${JSON.stringify(subcategoryCards)}
        )
        ON CONFLICT (category) 
        DO UPDATE SET
          featured_image_url = EXCLUDED.featured_image_url,
          featured_title = EXCLUDED.featured_title,
          featured_subtitle = EXCLUDED.featured_subtitle,
          featured_link = EXCLUDED.featured_link,
          quick_links = EXCLUDED.quick_links,
          subcategory_cards = EXCLUDED.subcategory_cards,
          updated_at = NOW()
      `;
      
      console.log(`✅ Imported: ${row.category}`);
    } catch (error) {
      console.error(`❌ Error importing ${row.category}:`, error);
    }
  }
  
  console.log('✅ Import complete');
}

async function main() {
  console.log('🚀 Migrating Mega Menu Content to Database\n');
  
  try {
    await createTable();
    await importFromCSV();
    
    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('  1. Update lib/content/mega-menu-content.ts to read from database');
    console.log('  2. Test the mega menu in local');
    console.log('  3. Deploy to production');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
