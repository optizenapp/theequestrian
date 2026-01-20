#!/usr/bin/env tsx

/**
 * Script 3: Fix Inappropriate Content
 * 
 * Removes inappropriate terminology from categories
 * - Removes "technical fabrics" from non-technical items (t-shirts, casual wear)
 * - Removes "seasoned professional" from casual products (bookmarks, gift cards)
 * - Removes "competition-grade" from non-competition items
 * - Replaces with appropriate descriptions per category type
 * 
 * Usage:
 *   npm run fix-inappropriate-content -- --dry-run  (preview changes)
 *   npm run fix-inappropriate-content -- --yes      (apply changes)
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

// Category classifications
const CATEGORY_TYPES = {
  technical: [
    '/clothing/womens/breeches',
    '/clothing/womens/tights',
    '/clothing/mens/breeches',
    '/clothing/kids/breeches',
    '/clothing/breeches',
    '/clothing/riding-tops',
    '/clothing/base-layers',
    '/rider/helmets',
    '/rider/safety-vests',
    '/rider/boots',
  ],
  casual: [
    '/clothing/womens/casual',
    '/clothing/mens/casual',
    '/clothing/kids/casual',
    '/clothing/t-shirts',
    '/clothing/sweaters',
    '/clothing/jeans',
    '/rider/giftware',
    '/rider/jewellery',
    '/accessories/bookmarks',
    '/gift-cards',
  ],
  equipment: [
    '/horse/saddles',
    '/horse/bridles',
    '/horse/boots',
    '/horse/rugs',
    '/horse/tack',
  ],
  accessories: [
    '/horse/grooming',
    '/rider/gloves',
    '/rider/spurs',
    '/accessories',
  ],
  pet: [
    '/pet',
    '/pet/dog',
    '/pet/cat',
    '/pet/bird',
    '/pet/small-animal',
  ],
};

// Inappropriate phrases by category type
const INAPPROPRIATE_PHRASES: Record<string, string[]> = {
  casual: [
    'technical fabrics',
    'technical fabric',
    'moisture-wicking',
    'competition-grade',
    'competition-approved',
    'seasoned professional',
    'professional standards',
    'certified protection',
    'meets industry standards',
  ],
  pet: [
    'seasoned professional',
    'competition-grade',
    'competition-approved',
    'technical fabrics',
    'certified protection',
  ],
  accessories: [
    'competition-grade',
    'seasoned professional',
  ],
};

function getCategoryType(urlPath: string): string {
  // Check exact matches first
  for (const [type, paths] of Object.entries(CATEGORY_TYPES)) {
    if (paths.includes(urlPath)) {
      return type;
    }
  }
  
  // Check partial matches
  if (urlPath.includes('/pet/')) return 'pet';
  if (urlPath.includes('/gift')) return 'casual';
  if (urlPath.includes('/giftware') || urlPath.includes('/jewellery')) return 'casual';
  if (urlPath.includes('/casual')) return 'casual';
  if (urlPath.includes('/t-shirt') || urlPath.includes('/sweater')) return 'casual';
  if (urlPath.includes('/saddle') || urlPath.includes('/bridle') || urlPath.includes('/rug')) return 'equipment';
  if (urlPath.includes('/breech') || urlPath.includes('/tight') || urlPath.includes('/helmet')) return 'technical';
  
  return 'general';
}

function fixInappropriateContent(content: string, categoryType: string): string {
  let fixed = content;
  
  // Get inappropriate phrases for this category type
  const phrasesToRemove = INAPPROPRIATE_PHRASES[categoryType] || [];
  
  // Remove inappropriate phrases
  phrasesToRemove.forEach(phrase => {
    // Remove the phrase and surrounding context
    const regex = new RegExp(`[^.]*${phrase}[^.]*\\.?`, 'gi');
    fixed = fixed.replace(regex, '');
  });
  
  // Clean up empty HTML tags
  fixed = fixed.replace(/<p>\s*<\/p>/gi, '');
  fixed = fixed.replace(/<li>\s*<\/li>/gi, '');
  fixed = fixed.replace(/<h[23]>\s*<\/h[23]>/gi, '');
  
  // Clean up multiple spaces
  fixed = fixed.replace(/\s{2,}/g, ' ');
  
  // Clean up orphaned punctuation
  fixed = fixed.replace(/\s+\./g, '.');
  fixed = fixed.replace(/\.\s*\./g, '.');
  
  return fixed.trim();
}

function fixFAQContent(faqJson: string, categoryType: string): string {
  if (!faqJson || faqJson === '[]') return faqJson;
  
  try {
    const faqs = JSON.parse(faqJson);
    
    // Fix inappropriate FAQ content
    const fixed = faqs.map((faq: any) => {
      let question = faq.question;
      let answer = faq.answer;
      
      // Remove inappropriate phrases from answers
      const phrasesToRemove = INAPPROPRIATE_PHRASES[categoryType] || [];
      phrasesToRemove.forEach(phrase => {
        const regex = new RegExp(`[^.]*${phrase}[^.]*\\.?`, 'gi');
        answer = answer.replace(regex, '');
      });
      
      // Clean up
      answer = answer.replace(/\s{2,}/g, ' ').trim();
      
      return { question, answer };
    });
    
    return JSON.stringify(fixed);
  } catch (e) {
    return faqJson;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run fix-inappropriate-content -- --dry-run  (preview changes)');
    console.log('  npm run fix-inappropriate-content -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; type: string; categoryType: string }> = [];
  
  // Process each row
  for (const row of rows) {
    const categoryType = getCategoryType(row.url_path);
    let rowChanged = false;
    
    // Only process casual, pet, and accessories categories
    if (['casual', 'pet', 'accessories'].includes(categoryType)) {
      // Fix long description
      const oldLongDesc = row.long_description;
      const newLongDesc = fixInappropriateContent(oldLongDesc, categoryType);
      
      if (oldLongDesc !== newLongDesc) {
        rowChanged = true;
        changes.push({
          url: row.url_path,
          type: 'long_description',
          categoryType,
        });
        
        if (!dryRun) {
          row.long_description = newLongDesc;
        }
      }
      
      // Fix short description
      const oldShortDesc = row.short_description;
      const newShortDesc = fixInappropriateContent(oldShortDesc, categoryType);
      
      if (oldShortDesc !== newShortDesc) {
        rowChanged = true;
        changes.push({
          url: row.url_path,
          type: 'short_description',
          categoryType,
        });
        
        if (!dryRun) {
          row.short_description = newShortDesc;
        }
      }
      
      // Fix FAQ content
      const oldFaq = row.faq_json;
      const newFaq = fixFAQContent(oldFaq, categoryType);
      
      if (oldFaq !== newFaq) {
        rowChanged = true;
        changes.push({
          url: row.url_path,
          type: 'faq_json',
          categoryType,
        });
        
        if (!dryRun) {
          row.faq_json = newFaq;
        }
      }
    }
    
    if (rowChanged) {
      changedCount++;
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 15):\n`);
  changes.slice(0, 15).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url} [${change.categoryType}]`);
    console.log(`   Field: ${change.type}`);
    console.log('');
  });
  
  if (changes.length > 15) {
    console.log(`... and ${changes.length - 15} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Total edits: ${changes.length}`);
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-fix-inappropriate-${timestamp}.csv`);
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
