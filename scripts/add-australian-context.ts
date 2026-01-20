#!/usr/bin/env tsx

/**
 * Script 6: Add Australian Context
 * 
 * Adds Australian-specific information to each category
 * - Climate considerations (summer/winter)
 * - Sizing conversions (EU to AU)
 * - Shipping information
 * - Local regulations (where relevant)
 * 
 * Usage:
 *   npm run add-australian-context -- --dry-run  (preview changes)
 *   npm run add-australian-context -- --yes      (apply changes)
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

// Australian context templates by category type
const AUSTRALIAN_CONTEXT: Record<string, string> = {
  'clothing': '<h3>Australian Sizing & Climate</h3><p>All clothing sizes include Australian conversions for easy ordering. Our range is perfect for Australian conditions, with lightweight, breathable options for hot summers and thermal styles for cooler southern regions. Fast dispatch from our Australian warehouse with free shipping nationwide.</p>',
  
  'breeches': '<h3>Australian Sizing Guide</h3><p>European sizing converted to Australian standards. Most brands run true to size, with size charts showing AU equivalents (EU 34 = AU 6, EU 36 = AU 8, etc.). Perfect for Australian riding conditions with moisture-wicking fabrics for hot weather and thermal options for winter.</p>',
  
  'rugs': '<h3>Australian Climate Guide</h3><p>Choose appropriate rug weights for your climate zone. Northern Australia and Queensland: 0-200g year-round for most horses. Southern regions (Victoria, Tasmania, NSW highlands): 200-400g for winter. Consider your horse\'s breed, clip, and shelter when selecting fill weight.</p>',
  
  'helmets': '<h3>Australian Safety Standards</h3><p>All helmets meet or exceed AS/NZS 3838 Australian safety standards. Required for competition and strongly recommended for all riding activities. Fast shipping Australia-wide with hassle-free returns if sizing isn\'t quite right.</p>',
  
  'boots-rider': '<h3>Australian Sizing & Shipping</h3><p>European sizing with AU conversions provided. Measure your calf circumference and height for best fit. Free shipping Australia-wide. Most orders dispatched within 24 hours from our Australian warehouse.</p>',
  
  'supplements': '<h3>Australian Regulations</h3><p>All supplements comply with Australian equine health regulations. Suitable for competition horses (check specific competition rules). Fast shipping Australia-wide. Store in cool, dry conditions - especially important in Australian summers.</p>',
  
  'grooming': '<h3>Perfect for Australian Conditions</h3><p>Essential grooming tools for Australian horse care. Particularly important during fly season (October-April) and for managing dust in dry conditions. Free shipping Australia-wide on all orders.</p>',
  
  'pet': '<h3>Australian Standards</h3><p>All pet products meet Australian safety and quality standards. Fast shipping Australia-wide with free delivery on all orders. Perfect for Australian pets and conditions.</p>',
};

function getCategoryType(urlPath: string): string {
  if (urlPath.includes('breech')) return 'breeches';
  if (urlPath.includes('tight')) return 'breeches'; // Use same context
  if (urlPath.includes('helmet')) return 'helmets';
  if (urlPath.includes('boot') && (urlPath.includes('rider') || urlPath.includes('clothing'))) return 'boots-rider';
  if (urlPath.includes('rug')) return 'rugs';
  if (urlPath.includes('supplement')) return 'supplements';
  if (urlPath.includes('grooming')) return 'grooming';
  if (urlPath.includes('pet')) return 'pet';
  if (urlPath.includes('clothing')) return 'clothing';
  
  return '';
}

function addAustralianContext(description: string, categoryType: string): string {
  if (!categoryType || !AUSTRALIAN_CONTEXT[categoryType]) {
    return description;
  }
  
  // Check if Australian context already exists
  if (description.includes('Australian') && description.includes('sizing')) {
    return description;
  }
  
  const contextSection = AUSTRALIAN_CONTEXT[categoryType];
  
  // Add before FAQs or at the end
  if (description.includes('<h3>Frequently Asked Questions</h3>')) {
    return description.replace(
      '<h3>Frequently Asked Questions</h3>',
      `${contextSection}\n<h3>Frequently Asked Questions</h3>`
    );
  } else if (description.includes('<h3>Shop by Category</h3>')) {
    return description.replace(
      '<h3>Shop by Category</h3>',
      `${contextSection}\n<h3>Shop by Category</h3>`
    );
  } else {
    // Add at the end
    return description + '\n' + contextSection;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run add-australian-context -- --dry-run  (preview changes)');
    console.log('  npm run add-australian-context -- --yes      (apply changes)');
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
  
  // Process each row
  for (const row of rows) {
    const categoryType = getCategoryType(row.url_path);
    
    if (categoryType) {
      const oldLongDesc = row.long_description;
      const newLongDesc = addAustralianContext(oldLongDesc, categoryType);
      
      if (oldLongDesc !== newLongDesc) {
        changedCount++;
        changes.push({
          url: row.url_path,
          categoryType,
        });
        
        if (!dryRun) {
          row.long_description = newLongDesc;
        }
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 15):\n`);
  changes.slice(0, 15).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Context: ${change.categoryType}`);
    console.log('');
  });
  
  if (changes.length > 15) {
    console.log(`... and ${changes.length - 15} more changes\n`);
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-australian-context-${timestamp}.csv`);
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
