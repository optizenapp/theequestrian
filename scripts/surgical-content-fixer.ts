#!/usr/bin/env tsx

/**
 * Surgical Content Fixer - ONLY Fix What's Broken
 * 
 * This script is SURGICAL - it only fixes specific broken elements:
 * 1. Wrong products in meta descriptions (e.g., "saddles, rugs, boots" on a halters page)
 * 2. Broken/incomplete bullet points (e.g., "<li>horses and riders</li>")
 * 3. Empty HTML elements (e.g., "<li><strong>Value:</strong> </li>")
 * 4. Puerto Rico content (completely irrelevant)
 * 
 * It PRESERVES:
 * - Internal links
 * - Proper structure
 * - Good content
 * - FAQs
 * - All other working elements
 * 
 * Usage:
 *   npm run surgical-fix -- --start=0 --max=10 --dry-run   (preview)
 *   npm run surgical-fix -- --start=0 --max=238            (apply all)
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

// ============================================================================
// SURGICAL FIX #1: Meta Descriptions with Wrong Products
// ============================================================================

function fixMetaDescriptionProducts(row: CsvRow): { fixed: boolean; old?: string; new?: string } {
  const { meta_description, h1_title } = row;
  
  // Check if meta description mentions wrong products
  const wrongProductPatterns = [
    'including saddles, rugs, boots and tack',
    'including dressage saddles, jumping saddles',
    'including helmets, boots, gloves and safety vests',
    'including bridles, bits, reins',
  ];
  
  const hasWrongProducts = wrongProductPatterns.some(pattern => 
    meta_description.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (!hasWrongProducts) {
    return { fixed: false };
  }
  
  const oldDesc = meta_description;
  
  // Generate category-specific meta description
  const categoryName = h1_title.toLowerCase();
  const newDesc = `Shop premium ${categoryName} from top equestrian brands. Quality products with fast shipping Australia-wide. Expert advice available.`;
  
  row.meta_description = newDesc;
  
  return { fixed: true, old: oldDesc, new: newDesc };
}

// ============================================================================
// SURGICAL FIX #2: Broken Bullet Points
// ============================================================================

function fixBrokenBullets(row: CsvRow): { fixed: boolean; removedCount?: number } {
  let desc = row.long_description;
  const originalDesc = desc;
  let removedCount = 0;
  
  // Remove incomplete/broken bullet points
  const brokenPatterns = [
    /<li>horses and riders<\/li>/g,
    /<li>in equestrian sports<\/li>/g,
    /<li>for horse and rider<\/li>/g,
    /<li>at all levels<\/li>/g,
  ];
  
  brokenPatterns.forEach(pattern => {
    const matches = desc.match(pattern);
    if (matches) {
      removedCount += matches.length;
      desc = desc.replace(pattern, '');
    }
  });
  
  if (desc !== originalDesc) {
    row.long_description = desc;
    return { fixed: true, removedCount };
  }
  
  return { fixed: false };
}

// ============================================================================
// SURGICAL FIX #3: Empty HTML Elements
// ============================================================================

function removeEmptyElements(row: CsvRow): { fixed: boolean; removedCount?: number } {
  let desc = row.long_description;
  const originalDesc = desc;
  let removedCount = 0;
  
  // Remove empty elements
  const emptyPatterns = [
    /<li><strong>[^<]*:<\/strong>\s*<\/li>/g,  // <li><strong>Value:</strong> </li>
    /<li>\s*<\/li>/g,                           // <li></li>
    /<ul>\s*<\/ul>/g,                           // <ul></ul>
    /<p>\s*<\/p>/g,                             // <p></p>
    /<h3>\s*<\/h3>/g,                           // <h3></h3>
  ];
  
  emptyPatterns.forEach(pattern => {
    const matches = desc.match(pattern);
    if (matches) {
      removedCount += matches.length;
      desc = desc.replace(pattern, '');
    }
  });
  
  // Clean up empty lists that might be left
  desc = desc.replace(/<ul>\s*<\/ul>/g, '');
  
  if (desc !== originalDesc) {
    row.long_description = desc;
    return { fixed: true, removedCount };
  }
  
  return { fixed: false };
}

// ============================================================================
// SURGICAL FIX #4: Puerto Rico Content (Nuclear Option)
// ============================================================================

function removePuertoRicoContent(row: CsvRow): { fixed: boolean } {
  let desc = row.long_description;
  const originalDesc = desc;
  
  // If it contains Puerto Rico content, nuke those paragraphs
  if (desc.includes('Puerto Rico') || desc.includes('Borinquen')) {
    desc = desc.replace(/<p>[\s\S]*?Puerto Rico[\s\S]*?<\/p>/g, '');
    desc = desc.replace(/<p>[\s\S]*?Borinquen[\s\S]*?<\/p>/g, '');
    desc = desc.replace(/<p>[\s\S]*?Puerto Rican[\s\S]*?<\/p>/g, '');
  }
  
  if (desc !== originalDesc) {
    row.long_description = desc;
    return { fixed: true };
  }
  
  return { fixed: false };
}

// ============================================================================
// SURGICAL FIX #5: Broken HTML Fragments
// ============================================================================

function fixBrokenFragments(row: CsvRow): { fixed: boolean } {
  let desc = row.long_description;
  const originalDesc = desc;
  
  // Remove paragraphs with only punctuation
  desc = desc.replace(/<p>[,\-\s\.]+<\/p>/g, '');
  
  // Clean up multiple newlines
  desc = desc.replace(/\n{3,}/g, '\n\n');
  desc = desc.trim();
  
  if (desc !== originalDesc) {
    row.long_description = desc;
    return { fixed: true };
  }
  
  return { fixed: false };
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, dryRun: boolean) {
  const fixes: string[] = [];
  let hasChanges = false;
  
  // Fix 1: Meta description products
  const metaFix = fixMetaDescriptionProducts(row);
  if (metaFix.fixed) {
    fixes.push(`Meta description: removed wrong products`);
    hasChanges = true;
    if (dryRun) {
      console.log(`   ❌ OLD: ${metaFix.old?.substring(0, 80)}...`);
      console.log(`   ✅ NEW: ${metaFix.new?.substring(0, 80)}...`);
    }
  }
  
  // Fix 2: Broken bullets
  const bulletFix = fixBrokenBullets(row);
  if (bulletFix.fixed) {
    fixes.push(`Removed ${bulletFix.removedCount} broken bullet points`);
    hasChanges = true;
  }
  
  // Fix 3: Empty elements
  const emptyFix = removeEmptyElements(row);
  if (emptyFix.fixed) {
    fixes.push(`Removed ${emptyFix.removedCount} empty HTML elements`);
    hasChanges = true;
  }
  
  // Fix 4: Puerto Rico
  const puertoRicoFix = removePuertoRicoContent(row);
  if (puertoRicoFix.fixed) {
    fixes.push(`Removed Puerto Rico content`);
    hasChanges = true;
  }
  
  // Fix 5: Broken fragments
  const fragmentFix = fixBrokenFragments(row);
  if (fragmentFix.fixed) {
    fixes.push(`Cleaned broken HTML fragments`);
    hasChanges = true;
  }
  
  // Only log if there were changes
  if (hasChanges) {
    console.log(`\n📄 ${row.url_path}`);
    console.log(`   ${row.h1_title}`);
    fixes.forEach(fix => console.log(`   ✅ ${fix}`));
  }
  
  return hasChanges;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const startRow = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
  const maxRows = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '10');
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRow[];
  
  const endRow = Math.min(startRow + maxRows, rows.length);
  
  console.log(`\n🔧 Surgical Content Fixer`);
  console.log(`   Processing: ${endRow - startRow} pages (rows ${startRow}-${endRow - 1})`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will apply changes)'}`);
  console.log(`   Strategy: SURGICAL - only fix broken elements, preserve everything else`);
  console.log('');
  
  let fixedCount = 0;
  
  // Process each page
  for (let i = startRow; i < endRow; i++) {
    const hasChanges = await processPage(rows[i], dryRun);
    if (hasChanges) {
      fixedCount++;
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`   Pages processed: ${endRow - startRow}`);
  console.log(`   Pages fixed: ${fixedCount}`);
  console.log(`   Pages unchanged: ${(endRow - startRow) - fixedCount}`);
  
  if (!dryRun) {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-surgical-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`\n💾 Backup: ${path.basename(backupPath)}`);
    
    // Write updated CSV
    const output = stringify(rows, {
      header: true,
      columns: [
        'url_path', 'h1_title', 'meta_title', 'meta_description', 'short_description',
        'long_description', 'breadcrumb_label', 'parent_url', 'category_level',
        'status', 'default_sort', 'faq_json', 'related_categories_json',
      ],
    });
    
    fs.writeFileSync(CSV_PATH, output, 'utf-8');
    console.log(`✅ Changes applied to collection-content.csv`);
  } else {
    console.log(`\n💡 Run without --dry-run to apply changes`);
  }
  
  console.log(`\n✨ Done!\n`);
}

main().catch(console.error);
