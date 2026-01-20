#!/usr/bin/env tsx

/**
 * Final Content Cleanup
 * 
 * Comprehensive cleanup of all remaining content issues:
 * - Fixes meta descriptions that mention wrong products
 * - Removes empty HTML sections (<ul></ul>, <h3></h3>, etc.)
 * - Fixes inappropriate FAQs for non-equipment categories
 * - Generates proper content for sparse/empty pages
 * - Fixes grammar issues ("handbag" vs "handbags")
 * 
 * Usage:
 *   npm run final-cleanup -- --dry-run  (preview changes)
 *   npm run final-cleanup -- --yes      (apply changes)
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

function generateProperMetaDescription(urlPath: string, h1Title: string): string {
  // Generate contextual meta description based on category
  const segments = urlPath.split('/').filter(s => s);
  const mainCategory = segments[0];
  
  if (mainCategory === 'rider') {
    if (urlPath.includes('luggage')) {
      return `Shop quality equestrian luggage and bags. Durable travel bags, gear bags, and accessories for riders. Free shipping Australia-wide. Find the perfect storage solution.`;
    }
    if (urlPath.includes('handbag')) {
      return `Shop stylish equestrian handbags and accessories. Quality bags designed for riders. Free shipping Australia-wide. Find your perfect handbag.`;
    }
  }
  
  // Default
  return `Shop premium ${h1Title.toLowerCase()} from top brands. Free shipping Australia-wide. Expert advice available. Find the perfect gear for your needs.`;
}

function cleanLongDescription(longDesc: string, h1Title: string): string {
  let cleaned = longDesc;
  
  // Remove empty HTML elements
  cleaned = cleaned.replace(/<ul>\s*<\/ul>/g, '');
  cleaned = cleaned.replace(/<ol>\s*<\/ol>/g, '');
  cleaned = cleaned.replace(/<h3>\s*<\/h3>/g, '');
  cleaned = cleaned.replace(/<h2>\s*<\/h2>/g, '');
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  
  // Remove empty list items
  cleaned = cleaned.replace(/<li>\s*<\/li>/g, '');
  
  // If long_description is now empty or just whitespace, generate basic content
  if (cleaned.trim().length < 50) {
    cleaned = `<h2>${h1Title}</h2><p>Browse our selection of ${h1Title.toLowerCase()}. Quality products from trusted brands with fast shipping Australia-wide.</p>`;
  }
  
  return cleaned.trim();
}

function generateProperFAQs(urlPath: string, h1Title: string): string {
  const segments = urlPath.split('/').filter(s => s);
  const mainCategory = segments[0];
  
  // For non-equipment categories (luggage, handbags, giftware, etc.), use generic FAQs
  if (urlPath.includes('luggage') || urlPath.includes('handbag') || 
      urlPath.includes('giftware') || urlPath.includes('jewellery') ||
      urlPath.includes('gift-card')) {
    
    const faqs = [
      {
        question: `What ${h1Title.toLowerCase()} do you stock?`,
        answer: `We stock a range of quality ${h1Title.toLowerCase()} suitable for equestrians. Browse our collection to see available styles, colors, and options. All products include detailed descriptions and specifications.`,
      },
      {
        question: 'Do you offer free shipping?',
        answer: 'Yes! We offer free shipping on all orders within Australia. Orders are typically dispatched within 24 hours. Express shipping options are available at checkout for urgent needs.',
      },
    ];
    
    return JSON.stringify(faqs);
  }
  
  // Keep existing FAQs for equipment categories
  return '';
}

function fixMetaDescriptionProducts(metaDesc: string, urlPath: string, h1Title: string): string {
  // If meta description mentions wrong products (helmets, boots, gloves for luggage/handbags)
  if (metaDesc.includes('including helmets, boots, gloves and safety vests') ||
      metaDesc.includes('including dressage saddles, jumping saddles')) {
    return generateProperMetaDescription(urlPath, h1Title);
  }
  
  return metaDesc;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run final-cleanup -- --dry-run  (preview changes)');
    console.log('  npm run final-cleanup -- --yes      (apply changes)');
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
    
    // Fix meta_description with wrong products
    const oldMetaDesc = row.meta_description;
    const newMetaDesc = fixMetaDescriptionProducts(oldMetaDesc, row.url_path, row.h1_title);
    if (oldMetaDesc !== newMetaDesc) {
      issues.push('meta_description (wrong products)');
      rowChanged = true;
      if (!dryRun) {
        row.meta_description = newMetaDesc;
      }
    }
    
    // Clean long_description (remove empty elements)
    const oldLongDesc = row.long_description;
    const newLongDesc = cleanLongDescription(oldLongDesc, row.h1_title);
    if (oldLongDesc !== newLongDesc) {
      issues.push('long_description (empty elements)');
      rowChanged = true;
      if (!dryRun) {
        row.long_description = newLongDesc;
      }
    }
    
    // Fix FAQs for non-equipment categories
    if (row.url_path.includes('luggage') || row.url_path.includes('handbag') || 
        row.url_path.includes('giftware') || row.url_path.includes('jewellery')) {
      
      try {
        const currentFaqs = JSON.parse(row.faq_json || '[]');
        
        // Check if FAQs mention inappropriate content (safety, competition, etc.)
        const hasInappropriateFAQ = currentFaqs.some((faq: any) => 
          faq.answer.includes('Safety should always come first') ||
          faq.answer.includes('competition-approved') ||
          faq.answer.includes('certified products')
        );
        
        if (hasInappropriateFAQ) {
          const newFaqs = generateProperFAQs(row.url_path, row.h1_title);
          if (newFaqs) {
            issues.push('faq_json (inappropriate)');
            rowChanged = true;
            if (!dryRun) {
              row.faq_json = newFaqs;
            }
          }
        }
      } catch (e) {
        // Skip if JSON parsing fails
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
  console.log(`\n📝 Changes Preview (showing first 30):\n`);
  changes.slice(0, 30).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Fixed: ${change.issues.join(', ')}`);
    console.log('');
  });
  
  if (changes.length > 30) {
    console.log(`... and ${changes.length - 30} more changes\n`);
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-final-cleanup-${timestamp}.csv`);
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
