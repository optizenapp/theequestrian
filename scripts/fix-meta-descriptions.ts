#!/usr/bin/env tsx

/**
 * Script 1: Fix Meta Descriptions
 * 
 * Expands all meta descriptions from 80-90 chars to 150-160 chars
 * - Adds specific product types for each category
 * - Includes "Australia" for local relevance
 * - Adds value propositions (free shipping, expert advice)
 * 
 * Usage:
 *   npm run fix-meta-descriptions -- --dry-run  (preview changes)
 *   npm run fix-meta-descriptions -- --yes      (apply changes)
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

// Category-specific product types and value propositions
const CATEGORY_PRODUCTS: Record<string, string[]> = {
  '/horse': ['saddles', 'rugs', 'boots', 'tack', 'grooming supplies', 'supplements'],
  '/horse/boots': ['brushing boots', 'tendon boots', 'travel boots', 'bell boots'],
  '/horse/rugs': ['turnout rugs', 'stable rugs', 'summer sheets', 'coolers', 'fly sheets'],
  '/horse/rugs/summer': ['lightweight turnout rugs', 'fly sheets', 'mesh rugs', 'combo rugs'],
  '/horse/rugs/winter': ['heavyweight turnout rugs', 'stable rugs', 'under rugs', 'combo rugs'],
  '/horse/rugs/stable': ['stable rugs', 'under rugs', 'fleece rugs', 'coolers'],
  '/horse/rugs/turnout': ['waterproof turnout rugs', 'combo rugs', 'neck covers'],
  '/horse/saddles': ['dressage saddles', 'jumping saddles', 'all-purpose saddles', 'endurance saddles'],
  '/horse/tack': ['bridles', 'reins', 'girths', 'stirrups', 'saddle pads'],
  '/horse/grooming': ['brushes', 'combs', 'hoof picks', 'grooming kits', 'shampoos'],
  '/horse/supplements': ['joint supplements', 'digestive aids', 'vitamins', 'electrolytes'],
  '/horse/bits': ['snaffle bits', 'pelham bits', 'weymouth bits', 'bit guards'],
  
  '/rider': ['helmets', 'boots', 'gloves', 'safety vests', 'riding apparel'],
  '/rider/helmets': ['riding helmets', 'skull caps', 'ventilated helmets', 'competition helmets'],
  '/rider/boots': ['tall boots', 'paddock boots', 'riding boots', 'competition boots'],
  '/rider/gloves': ['riding gloves', 'winter gloves', 'competition gloves', 'grip gloves'],
  '/rider/spurs': ['dressage spurs', 'jumping spurs', 'spur straps', 'rowel spurs'],
  
  '/clothing': ['breeches', 'jodhpurs', 'riding tops', 'jackets', 'base layers'],
  '/clothing/womens': ['ladies breeches', 'riding tights', 'competition shirts', 'show jackets'],
  '/clothing/mens': ['men\'s breeches', 'riding shirts', 'show jackets', 'polo shirts'],
  '/clothing/kids': ['children\'s breeches', 'jodhpurs', 'riding tops', 'show jackets'],
  '/clothing/breeches': ['full-seat breeches', 'knee-patch breeches', 'competition breeches'],
  '/clothing/footwear': ['riding boots', 'jodhpur boots', 'paddock boots', 'boot accessories'],
  '/clothing/jackets': ['show jackets', 'softshell jackets', 'rain jackets', 'competition jackets'],
  
  '/pet': ['dog treats', 'cat toys', 'bird supplies', 'small animal bedding'],
  '/pet/dog': ['dog treats', 'dog toys', 'dog beds', 'dog grooming supplies'],
  '/pet/cat': ['cat treats', 'cat toys', 'scratching posts', 'litter accessories'],
  '/pet/bird': ['bird seed', 'bird toys', 'cages', 'perches'],
  
  '/gift-cards': ['gift cards', 'e-gift cards', 'gift vouchers'],
};

const VALUE_PROPS = [
  'Free shipping Australia-wide',
  'Expert advice available',
  'Fast dispatch',
  'Top brands',
  'Quality guaranteed',
  'Trusted by riders nationwide',
];

function generateMetaDescription(row: CsvRow): string {
  const urlPath = row.url_path;
  const h1Title = row.h1_title;
  
  // Get specific products for this category
  let products = CATEGORY_PRODUCTS[urlPath] || [];
  
  // If no exact match, try to infer from parent categories
  if (products.length === 0) {
    const segments = urlPath.split('/').filter(s => s);
    for (let i = segments.length; i > 0; i--) {
      const parentPath = '/' + segments.slice(0, i).join('/');
      if (CATEGORY_PRODUCTS[parentPath]) {
        products = CATEGORY_PRODUCTS[parentPath];
        break;
      }
    }
  }
  
  // Build the description
  let description = '';
  
  // Start with action + category
  if (urlPath === '/gift-cards') {
    description = 'Purchase gift cards for The Equestrian. ';
  } else {
    description = `Shop premium ${h1Title.toLowerCase()} `;
  }
  
  // Add specific products if available
  if (products.length > 0) {
    const productList = products.slice(0, 4).join(', ').replace(/, ([^,]*)$/, ' and $1');
    description += `including ${productList}. `;
  } else {
    description += 'from top brands. ';
  }
  
  // Add value propositions
  const selectedProps = VALUE_PROPS.slice(0, 2).join('. ');
  description += selectedProps + '.';
  
  // Add Australian context if not already present
  if (!description.includes('Australia')) {
    description = description.replace(/\.$/, ' Australia-wide.');
  }
  
  // Ensure length is 150-160 characters
  if (description.length < 150) {
    // Add more context
    description = description.replace(/\.$/, '. Find the perfect gear for your needs.');
  }
  
  if (description.length > 160) {
    // Trim to 160 chars, ending at a word boundary
    description = description.substring(0, 157).trim();
    const lastSpace = description.lastIndexOf(' ');
    if (lastSpace > 140) {
      description = description.substring(0, lastSpace) + '...';
    } else {
      description += '...';
    }
  }
  
  return description;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run fix-meta-descriptions -- --dry-run  (preview changes)');
    console.log('  npm run fix-meta-descriptions -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; old: string; new: string }> = [];
  
  // Process each row
  for (const row of rows) {
    const oldDescription = row.meta_description;
    const newDescription = generateMetaDescription(row);
    
    if (oldDescription !== newDescription) {
      changedCount++;
      changes.push({
        url: row.url_path,
        old: oldDescription,
        new: newDescription,
      });
      
      if (!dryRun) {
        row.meta_description = newDescription;
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 10):\n`);
  changes.slice(0, 10).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   OLD (${change.old.length} chars): ${change.old}`);
    console.log(`   NEW (${change.new.length} chars): ${change.new}`);
    console.log('');
  });
  
  if (changes.length > 10) {
    console.log(`... and ${changes.length - 10} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Changed: ${changedCount}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-meta-descriptions-${timestamp}.csv`);
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
