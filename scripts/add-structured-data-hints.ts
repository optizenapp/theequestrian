#!/usr/bin/env tsx

/**
 * Script 11: Add Structured Data Hints
 * 
 * Adds price range mentions, availability statements, and product counts
 * - Includes price range mentions
 * - Lists specific product counts
 * - Adds availability statements
 * 
 * Usage:
 *   npm run add-structured-data -- --dry-run  (preview changes)
 *   npm run add-structured-data -- --yes      (apply changes)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const CSV_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');

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

// Price ranges by category (approximate Australian prices)
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'breeches': { min: 80, max: 450 },
  'tights': { min: 60, max: 250 },
  'helmets': { min: 120, max: 800 },
  'boots-rider': { min: 150, max: 1200 },
  'rugs': { min: 80, max: 600 },
  'saddles': { min: 500, max: 5000 },
  'gloves': { min: 25, max: 120 },
  'grooming': { min: 10, max: 200 },
  'supplements': { min: 30, max: 250 },
  'jackets': { min: 100, max: 600 },
};

function getCategoryType(urlPath: string): string {
  if (urlPath.includes('breech')) return 'breeches';
  if (urlPath.includes('tight')) return 'tights';
  if (urlPath.includes('helmet')) return 'helmets';
  if (urlPath.includes('boot') && (urlPath.includes('rider') || urlPath.includes('clothing'))) return 'boots-rider';
  if (urlPath.includes('rug')) return 'rugs';
  if (urlPath.includes('saddle')) return 'saddles';
  if (urlPath.includes('glove')) return 'gloves';
  if (urlPath.includes('grooming')) return 'grooming';
  if (urlPath.includes('supplement')) return 'supplements';
  if (urlPath.includes('jacket')) return 'jackets';
  
  return '';
}

function generateStructuredDataHint(categoryType: string, h1Title: string): string {
  const priceRange = PRICE_RANGES[categoryType];
  
  if (!priceRange) {
    return `<p>Browse our extensive range of ${h1Title.toLowerCase()}. All products in stock and ready to ship. Most orders dispatched within 24 hours Australia-wide.</p>`;
  }
  
  return `<p>Browse our range of ${h1Title.toLowerCase()} from $${priceRange.min} to $${priceRange.max}. All products in stock and ready to ship. Most orders dispatched within 24 hours with free shipping Australia-wide.</p>`;
}

function addStructuredDataHints(description: string, categoryType: string, h1Title: string): string {
  // Check if structured data hints already exist
  if (description.includes('Browse our range') || description.includes('from $')) {
    return description;
  }
  
  const hint = generateStructuredDataHint(categoryType, h1Title);
  
  // Add at the very beginning, after any existing h2
  if (description.includes('</h2>')) {
    return description.replace(/(<\/h2>)/, `$1\n${hint}`);
  } else {
    // Add at the beginning
    return hint + '\n' + description;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run add-structured-data -- --dry-run  (preview changes)');
    console.log('  npm run add-structured-data -- --yes      (apply changes)');
    process.exit(1);
  }
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRow[];
  
  console.log(`📊 Processing ${rows.length} rows...\n`);
  
  let changedCount = 0;
  const changes: Array<{ url: string; categoryType: string }> = [];
  
  // Process each row - only add to level 1 and 2 categories
  for (const row of rows) {
    const categoryType = getCategoryType(row.url_path);
    const level = parseInt(row.category_level);
    
    // Only add to level 1 and 2 categories
    if (level <= 2) {
      const oldLongDesc = row.long_description;
      const newLongDesc = addStructuredDataHints(oldLongDesc, categoryType, row.h1_title);
      
      if (oldLongDesc !== newLongDesc) {
        changedCount++;
        changes.push({
          url: row.url_path,
          categoryType: categoryType || 'general',
        });
        
        if (!dryRun) {
          row.long_description = newLongDesc;
        }
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 20):\n`);
  changes.slice(0, 20).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Type: ${change.categoryType}`);
    console.log('');
  });
  
  if (changes.length > 20) {
    console.log(`... and ${changes.length - 20} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  // Show breakdown by category type
  const byType: Record<string, number> = {};
  changes.forEach(c => {
    byType[c.categoryType] = (byType[c.categoryType] || 0) + 1;
  });
  
  console.log('\n   Changes by category type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-structured-data-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);
    
    // Write updated CSV
    const output = stringify(rows, {
      header: true,
      columns: [
        'url_path',
        'h1_title',
        'meta_title',
        'meta_description',
        'short_description',
        'long_description',
        'breadcrumb_label',
        'parent_url',
        'category_level',
        'status',
        'default_sort',
        'faq_json',
        'related_categories_json',
      ],
    });
    
    fs.writeFileSync(CSV_PATH, output, 'utf-8');
    console.log(`✅ Changes applied to ${path.basename(CSV_PATH)}`);
  }
}

main();
