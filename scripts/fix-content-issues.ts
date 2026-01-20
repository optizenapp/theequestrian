#!/usr/bin/env tsx

/**
 * Fix Content Issues
 * 
 * Fixes specific issues found in the CSV:
 * - Removes "SADDLES:" and similar prefixes from meta_title
 * - Fixes lowercase starts in short_description
 * - Removes broken grammar fragments from long_description
 * - Fixes H2 titles with unnecessary prefixes
 * - Makes meta descriptions specific to each subcategory
 * 
 * Usage:
 *   npm run fix-content-issues -- --dry-run  (preview changes)
 *   npm run fix-content-issues -- --yes      (apply changes)
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

function fixMetaTitle(metaTitle: string, h1Title: string): string {
  // Remove prefixes like "SADDLES:", "RUGS:", "FOOTWEAR:", etc.
  let fixed = metaTitle.replace(/^[A-Z\s]+:\s*/g, '');
  
  // If it still starts with the category in all caps, fix it
  fixed = fixed.replace(/^([A-Z\s]+)\s+([A-Z])/g, (match, p1, p2) => {
    return p2 + match.substring(p1.length + 1);
  });
  
  return fixed;
}

function fixShortDescription(shortDesc: string): string {
  // Capitalize first letter
  if (!shortDesc) return shortDesc;
  
  // Remove patterns like "saddles: jumping saddles."
  let fixed = shortDesc.replace(/^[a-z\s]+:\s*/i, '');
  
  // Capitalize first letter
  fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
  
  return fixed;
}

function fixLongDescription(longDesc: string, h1Title: string): string {
  let fixed = longDesc;
  
  // Remove broken fragments like "<p>, . that .</p>" or "<p>- . text .</p>"
  fixed = fixed.replace(/<p>[,\-\s\.]+<\/p>/g, '');
  fixed = fixed.replace(/<p>[,\-\s\.]+(that|the|for|and|with)[,\-\s\.]+<\/p>/gi, '');
  
  // Fix H2 titles with prefixes like "Premium SADDLES: Jumping Saddles"
  fixed = fixed.replace(/<h2>Premium\s+[A-Z\s]+:\s*([^<]+)<\/h2>/g, '<h2>$1</h2>');
  
  // Fix any remaining "CATEGORY: Title" patterns in h2
  fixed = fixed.replace(/<h2>[A-Z\s]+:\s*([^<]+)<\/h2>/g, '<h2>$1</h2>');
  
  // Fix H3 titles with prefixes like "What Makes Great SADDLES: Jumping Saddles?"
  fixed = fixed.replace(/<h3>What Makes Great\s+[A-Z\s]+:\s*([^<\?]+)(\?)?<\/h3>/g, '<h3>What Makes Great $1$2</h3>');
  
  // Fix any remaining "CATEGORY: Title" patterns in h3
  fixed = fixed.replace(/<h3>([^<]*?)\s+[A-Z\s]+:\s*([^<]+)<\/h3>/g, '<h3>$1 $2</h3>');
  
  // Clean up multiple spaces
  fixed = fixed.replace(/\s{2,}/g, ' ');
  
  // Clean up empty paragraphs again
  fixed = fixed.replace(/<p>\s*<\/p>/g, '');
  
  return fixed.trim();
}

function generateSpecificMetaDescription(urlPath: string, h1Title: string): string {
  const segments = urlPath.split('/').filter(s => s);
  const mainCategory = segments[0];
  const subCategory = segments[1];
  const specificCategory = segments[2];
  
  // Generate specific meta description based on the actual category
  if (mainCategory === 'horse' && subCategory === 'saddles') {
    const saddleTypes: Record<string, string> = {
      'jumping': 'Shop premium jumping saddles with forward-cut flaps and knee rolls. Designed for show jumping and cross-country. Free shipping Australia-wide. Expert advice available.',
      'dressage': 'Shop premium dressage saddles with deep seats and straight flaps. Designed for classical dressage position. Free shipping Australia-wide. Expert advice available.',
      'all-purpose': 'Shop versatile all-purpose saddles suitable for flatwork and jumping. Perfect for general riding. Free shipping Australia-wide. Expert advice available.',
      'accessories': 'Shop saddle accessories including gullets, stirrups, and saddle pads. Essential saddle care items. Free shipping Australia-wide. Expert advice available.',
    };
    
    if (specificCategory && saddleTypes[specificCategory]) {
      return saddleTypes[specificCategory];
    }
  }
  
  // For other categories, generate based on h1_title
  return `Shop premium ${h1Title.toLowerCase()} from top brands. Free shipping Australia-wide. Expert advice available. Find the perfect gear for your needs.`;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run fix-content-issues -- --dry-run  (preview changes)');
    console.log('  npm run fix-content-issues -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; issues: string[] }> = [];
  
  // Process each row
  for (const row of rows) {
    const issues: string[] = [];
    let rowChanged = false;
    
    // Fix meta_title
    const oldMetaTitle = row.meta_title;
    const newMetaTitle = fixMetaTitle(oldMetaTitle, row.h1_title);
    if (oldMetaTitle !== newMetaTitle) {
      issues.push('meta_title');
      rowChanged = true;
      if (!dryRun) {
        row.meta_title = newMetaTitle;
      }
    }
    
    // Fix short_description
    const oldShortDesc = row.short_description;
    const newShortDesc = fixShortDescription(oldShortDesc);
    if (oldShortDesc !== newShortDesc) {
      issues.push('short_description');
      rowChanged = true;
      if (!dryRun) {
        row.short_description = newShortDesc;
      }
    }
    
    // Fix long_description
    const oldLongDesc = row.long_description;
    const newLongDesc = fixLongDescription(oldLongDesc, row.h1_title);
    if (oldLongDesc !== newLongDesc) {
      issues.push('long_description');
      rowChanged = true;
      if (!dryRun) {
        row.long_description = newLongDesc;
      }
    }
    
    // Fix meta_description if it's generic
    const oldMetaDesc = row.meta_description;
    if (oldMetaDesc.includes('including dressage saddles, jumping saddles, all-purpose saddles')) {
      const newMetaDesc = generateSpecificMetaDescription(row.url_path, row.h1_title);
      if (oldMetaDesc !== newMetaDesc) {
        issues.push('meta_description');
        rowChanged = true;
        if (!dryRun) {
          row.meta_description = newMetaDesc;
        }
      }
    }
    
    if (rowChanged) {
      changedCount++;
      changes.push({
        url: row.url_path,
        issues,
      });
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 20):\n`);
  changes.slice(0, 20).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Fixed: ${change.issues.join(', ')}`);
    console.log('');
  });
  
  if (changes.length > 20) {
    console.log(`... and ${changes.length - 20} more changes\n`);
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-fix-issues-${timestamp}.csv`);
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
