#!/usr/bin/env tsx

/**
 * Script 2: Remove Template Phrases
 * 
 * Removes all templated opening paragraphs and generic phrases
 * - Removes "Welcome to our specialized..."
 * - Removes "Whether you're a seasoned professional..."
 * - Removes "cutting-edge technology" and "time-tested designs"
 * - Replaces with category-appropriate intros
 * 
 * Usage:
 *   npm run remove-templates -- --dry-run  (preview changes)
 *   npm run remove-templates -- --yes      (apply changes)
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

// Template patterns to remove
const TEMPLATE_PATTERNS = [
  /Welcome to our (specialized|complete) .* collection\./gi,
  /Whether you're a seasoned professional or just starting out/gi,
  /finding the right .* makes all the difference/gi,
  /We've assembled an exceptional range/gi,
  /combines cutting-edge technology with time-tested designs/gi,
  /We've assembled everything you need in one place/gi,
  /from everyday essentials to competition-grade equipment/gi,
  /Every product has been carefully selected by our expert team/gi,
  /who understand the unique demands of/gi,
  /Browse our specialized categories below to find exactly what you're looking for\./gi,
  /Expertly crafted from the finest materials for lasting performance/gi,
  /Thoughtfully engineered to meet the specific needs of/gi,
  /Products from manufacturers with proven track records/gi,
  /Investment pieces that deliver exceptional performance over time/gi,
  /Certified protection that meets or exceeds industry standards/gi,
  /Ergonomic designs that you'll actually want to wear/gi,
  /Attention to detail that ensures longevity and reliability/gi,
  /Competition-approved gear trusted by top riders/gi,
  /Advanced moisture-wicking and breathable materials that keep you comfortable in the saddle/gi,
  /Designed specifically for riding with stretch panels and reinforced seams where you need them most/gi,
  /Built to withstand daily wear, frequent washing, and the demands of equestrian life/gi,
  /Look professional in the arena and fashionable at the barn with timeless designs/gi,
];

// Generic phrases to remove
const GENERIC_PHRASES = [
  'Premium Quality:',
  'Functional Design:',
  'Trusted Brands:',
  'Great Value:',
  'Quality Materials:',
  'Thoughtful Design:',
  'Expert Selection:',
  'Safety First:',
  'Comfort:',
  'Quality Construction:',
  'Professional Standards:',
  'Technical Fabrics:',
  'Perfect Fit:',
  'Durability:',
  'Style:',
];

function cleanLongDescription(description: string, urlPath: string, h1Title: string): string {
  let cleaned = description;
  
  // Remove template patterns
  TEMPLATE_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove generic bullet point headers (but keep the content after them)
  GENERIC_PHRASES.forEach(phrase => {
    const regex = new RegExp(`<strong>${phrase}</strong>\\s*`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Clean up empty paragraphs and extra whitespace
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<p>\s+/gi, '<p>');
  cleaned = cleaned.replace(/\s+<\/p>/gi, '</p>');
  
  // Remove empty list items
  cleaned = cleaned.replace(/<li>\s*<\/li>/gi, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Remove "Premium [Category]" h2 headers that are just the category name
  const categoryName = h1Title;
  cleaned = cleaned.replace(new RegExp(`<h2>Premium ${categoryName}</h2>`, 'gi'), '');
  
  // If the description starts with just <p>Welcome or <p>We've, remove the entire first paragraph
  if (cleaned.match(/^<p>(Welcome|We've)/i)) {
    cleaned = cleaned.replace(/^<p>.*?<\/p>/, '');
  }
  
  // Clean up any remaining "Welcome to our" or "We've assembled"
  cleaned = cleaned.replace(/Welcome to our[^.]*\./gi, '');
  cleaned = cleaned.replace(/We've assembled[^.]*\./gi, '');
  
  return cleaned.trim();
}

function cleanShortDescription(description: string): string {
  let cleaned = description;
  
  // Remove generic phrases
  cleaned = cleaned.replace(/Browse our extensive range of/gi, '');
  cleaned = cleaned.replace(/Discover our complete collection of/gi, '');
  cleaned = cleaned.replace(/Explore our specialized range of/gi, '');
  cleaned = cleaned.replace(/products\./gi, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  // If it's too generic, return empty (will be regenerated later)
  if (cleaned.length < 20 || cleaned.match(/^(Browse|Discover|Explore)/i)) {
    return '';
  }
  
  return cleaned;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run remove-templates -- --dry-run  (preview changes)');
    console.log('  npm run remove-templates -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; type: string; before: number; after: number }> = [];
  
  // Process each row
  for (const row of rows) {
    let rowChanged = false;
    
    // Clean long description
    const oldLongDesc = row.long_description;
    const newLongDesc = cleanLongDescription(oldLongDesc, row.url_path, row.h1_title);
    
    if (oldLongDesc !== newLongDesc) {
      rowChanged = true;
      changes.push({
        url: row.url_path,
        type: 'long_description',
        before: oldLongDesc.length,
        after: newLongDesc.length,
      });
      
      if (!dryRun) {
        row.long_description = newLongDesc;
      }
    }
    
    // Clean short description
    const oldShortDesc = row.short_description;
    const newShortDesc = cleanShortDescription(oldShortDesc);
    
    if (oldShortDesc !== newShortDesc && newShortDesc !== '') {
      rowChanged = true;
      changes.push({
        url: row.url_path,
        type: 'short_description',
        before: oldShortDesc.length,
        after: newShortDesc.length,
      });
      
      if (!dryRun) {
        row.short_description = newShortDesc;
      }
    }
    
    if (rowChanged) {
      changedCount++;
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 10):\n`);
  changes.slice(0, 10).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url} - ${change.type}`);
    console.log(`   Length: ${change.before} → ${change.after} chars (${change.after - change.before > 0 ? '+' : ''}${change.after - change.before})`);
    console.log('');
  });
  
  if (changes.length > 10) {
    console.log(`... and ${changes.length - 10} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Total edits: ${changes.length}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-remove-templates-${timestamp}.csv`);
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
