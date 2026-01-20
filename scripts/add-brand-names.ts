#!/usr/bin/env tsx

/**
 * Script 4: Add Brand Names
 * 
 * Adds 3-5 relevant brand names to each category
 * - Uses brand mapping from exports/brand-mapping.csv
 * - Inserts brands naturally into descriptions
 * - Creates brand-specific sentences
 * 
 * Usage:
 *   npm run add-brands -- --dry-run  (preview changes)
 *   npm run add-brands -- --yes      (apply changes)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const CSV_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');
const BRAND_CSV_PATH = path.join(process.cwd(), 'exports', 'brand-mapping.csv');

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

// Category-specific brand mappings (curated list of top brands per category)
const CATEGORY_BRANDS: Record<string, string[]> = {
  '/horse/rugs': ['Weatherbeeta', 'Horseware', 'Rambo', 'Bucas', 'Amigo'],
  '/horse/rugs/summer': ['Weatherbeeta', 'Horseware', 'Rambo', 'Amigo'],
  '/horse/rugs/winter': ['Weatherbeeta', 'Horseware', 'Rambo', 'Bucas'],
  '/horse/rugs/stable': ['Horseware', 'Weatherbeeta', 'Rambo'],
  '/horse/rugs/turnout': ['Weatherbeeta', 'Horseware', 'Rambo', 'Bucas'],
  '/horse/saddles': ['Bates', 'Wintec', 'Pessoa', 'Stubben', 'Collegiate'],
  '/horse/boots': ['Weatherbeeta', 'Horseware', 'Eskadron', 'LeMieux'],
  '/horse/tack': ['PS of Sweden', 'Weatherbeeta', 'Collegiate'],
  '/horse/grooming': ['Oster', 'Wahl', 'Mane & Tail'],
  '/horse/supplements': ['Cavalor', 'NAF', 'Equine America'],
  
  '/clothing/womens': ['Pikeur', 'Cavallo', 'Horze', 'Equiline', 'Ariat'],
  '/clothing/womens/breeches': ['Pikeur', 'Cavallo', 'Horze', 'Equiline', 'Ariat'],
  '/clothing/womens/tights': ['Horze', 'Ariat', 'Cavallo', 'Pikeur'],
  '/clothing/womens/tops': ['Pikeur', 'Cavallo', 'Ariat', 'Horze'],
  '/clothing/womens/jackets': ['Pikeur', 'Cavallo', 'Ariat', 'Horze'],
  '/clothing/mens': ['Ariat', 'Cavallo', 'Pikeur', 'Horze'],
  '/clothing/mens/breeches': ['Pikeur', 'Cavallo', 'Ariat', 'Horze'],
  '/clothing/kids': ['Ariat', 'Horze', 'Cavallo', 'Pikeur'],
  '/clothing/kids/breeches': ['Ariat', 'Horze', 'Cavallo'],
  '/clothing/footwear': ['Ariat', 'Mountain Horse', 'Cavallo', 'Dublin'],
  '/clothing/breeches': ['Pikeur', 'Cavallo', 'Horze', 'Equiline', 'Ariat'],
  
  '/rider/helmets': ['Charles Owen', 'Samshield', 'KEP', 'GPA', 'Uvex'],
  '/rider/boots': ['Ariat', 'Mountain Horse', 'Cavallo', 'Dublin'],
  '/rider/gloves': ['Roeckl', 'SSG', 'Heritage', 'Ariat'],
  '/rider/spurs': ['Sprenger', 'Herm Sprenger', 'Coronet'],
  
  '/pet/dog': ['Royal Canin', 'Eukanuba', 'Pedigree'],
  '/pet/cat': ['Royal Canin', 'Whiskas', 'Purina'],
};

function getBrandsForCategory(urlPath: string): string[] {
  // Try exact match first
  if (CATEGORY_BRANDS[urlPath]) {
    return CATEGORY_BRANDS[urlPath];
  }
  
  // Try parent categories
  const segments = urlPath.split('/').filter(s => s);
  for (let i = segments.length - 1; i > 0; i--) {
    const parentPath = '/' + segments.slice(0, i).join('/');
    if (CATEGORY_BRANDS[parentPath]) {
      return CATEGORY_BRANDS[parentPath];
    }
  }
  
  return [];
}

function addBrandsToDescription(description: string, brands: string[], categoryName: string): string {
  if (brands.length === 0 || !description) {
    return description;
  }
  
  // Don't add if brands already mentioned
  const lowerDesc = description.toLowerCase();
  if (brands.some(brand => lowerDesc.includes(brand.toLowerCase()))) {
    return description;
  }
  
  // Create brand sentence
  let brandSentence = '';
  if (brands.length === 1) {
    brandSentence = `<p>Shop premium ${categoryName.toLowerCase()} from ${brands[0]}.`;
  } else if (brands.length === 2) {
    brandSentence = `<p>Shop premium ${categoryName.toLowerCase()} from leading brands including ${brands[0]} and ${brands[1]}.`;
  } else {
    const lastBrand = brands[brands.length - 1];
    const otherBrands = brands.slice(0, -1).join(', ');
    brandSentence = `<p>Shop premium ${categoryName.toLowerCase()} from leading brands including ${otherBrands} and ${lastBrand}.`;
  }
  
  brandSentence += ' Each brand offers unique features and quality craftsmanship.</p>';
  
  // Insert after the first heading or at the beginning
  if (description.includes('</h2>')) {
    // Insert after first h2
    description = description.replace(/(<\/h2>)/, `$1\n${brandSentence}`);
  } else if (description.includes('</h3>')) {
    // Insert after first h3
    description = description.replace(/(<\/h3>)/, `$1\n${brandSentence}`);
  } else if (description.includes('<p>')) {
    // Insert after first paragraph
    description = description.replace(/(<p>.*?<\/p>)/, `$1\n${brandSentence}`);
  } else {
    // Insert at beginning
    description = brandSentence + '\n' + description;
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
    console.log('  npm run add-brands -- --dry-run  (preview changes)');
    console.log('  npm run add-brands -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; brands: string[] }> = [];
  
  // Process each row
  for (const row of rows) {
    const brands = getBrandsForCategory(row.url_path);
    
    if (brands.length > 0) {
      const oldLongDesc = row.long_description;
      const newLongDesc = addBrandsToDescription(oldLongDesc, brands, row.h1_title);
      
      if (oldLongDesc !== newLongDesc) {
        changedCount++;
        changes.push({
          url: row.url_path,
          brands,
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
    console.log(`   Brands: ${change.brands.join(', ')}`);
    console.log('');
  });
  
  if (changes.length > 15) {
    console.log(`... and ${changes.length - 15} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-add-brands-${timestamp}.csv`);
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
