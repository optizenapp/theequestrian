#!/usr/bin/env tsx

/**
 * Smart Content Fixer - Actually Intelligent This Time
 * 
 * Goes through each page and:
 * 1. Validates Wikipedia relevance (rejects irrelevant matches)
 * 2. Fixes ACTUAL issues (wrong products in meta descriptions)
 * 3. Removes broken content (empty bullets, Puerto Rico text, etc.)
 * 4. Only adds content if it's RELEVANT to the category
 * 5. Shows what it's doing so you can verify
 * 
 * Usage:
 *   npm run smart-fix -- --start=0 --max=10 --dry-run   (preview)
 *   npm run smart-fix -- --start=0 --max=10             (apply)
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
// VALIDATION: Check if Wikipedia content is actually relevant
// ============================================================================

function isRelevantWikipediaMatch(wikiTitle: string, categoryTitle: string, urlPath: string): boolean {
  const lowerWikiTitle = wikiTitle.toLowerCase();
  const lowerCategoryTitle = categoryTitle.toLowerCase();
  
  // REJECT obviously wrong matches
  const badMatches = [
    'puerto rico', 'puerto rican', 'list of',
    'deadly women', 'john whitaker', 'ariat',
    'equestrian statue', 'cultural references',
  ];
  
  if (badMatches.some(bad => lowerWikiTitle.includes(bad))) {
    return false;
  }
  
  // ACCEPT if Wikipedia title contains category keywords
  const categoryKeywords = lowerCategoryTitle.split(' ').filter(w => w.length > 3);
  const hasRelevantKeyword = categoryKeywords.some(keyword => lowerWikiTitle.includes(keyword));
  
  if (hasRelevantKeyword) {
    return true;
  }
  
  // ACCEPT general equestrian terms
  const goodMatches = [
    'saddle', 'bridle', 'helmet', 'boot', 'rug', 'blanket',
    'breeches', 'riding', 'horse', 'tack', 'halter',
    'equestrianism', 'glossary of equestrian',
  ];
  
  if (goodMatches.some(good => lowerWikiTitle.includes(good))) {
    return true;
  }
  
  // REJECT everything else
  return false;
}

// ============================================================================
// FIXES: Actually fix the real problems
// ============================================================================

function fixMetaDescription(row: CsvRow): { fixed: boolean; reason?: string } {
  const { meta_description, url_path, h1_title } = row;
  
  // Check for wrong product mentions
  const wrongProducts = [
    'including saddles, rugs, boots and tack',
    'including dressage saddles, jumping saddles',
    'including helmets, boots, gloves and safety vests',
  ];
  
  const hasWrongProducts = wrongProducts.some(wrong => meta_description.includes(wrong));
  
  if (hasWrongProducts) {
    // Generate proper meta description based on actual category
    const categoryName = h1_title.toLowerCase();
    row.meta_description = `Shop quality ${categoryName} from trusted equestrian brands. Premium products with fast shipping Australia-wide. Expert advice available.`;
    
    return { fixed: true, reason: 'Wrong products mentioned' };
  }
  
  // Check length
  if (meta_description.length < 120) {
    const categoryName = h1_title.toLowerCase();
    row.meta_description = `Shop premium ${categoryName} from top equestrian brands. Quality products with fast shipping Australia-wide. Expert advice and support available.`;
    
    return { fixed: true, reason: 'Too short' };
  }
  
  return { fixed: false };
}

function cleanLongDescription(row: CsvRow): { fixed: boolean; reason?: string } {
  let desc = row.long_description;
  const originalDesc = desc;
  
  // REMOVE Puerto Rico content (completely irrelevant!)
  if (desc.includes('Puerto Rico') || desc.includes('Puerto Rican')) {
    desc = desc.replace(/<p>[\s\S]*?Puerto Rico[\s\S]*?<\/p>/g, '');
    desc = desc.replace(/<p>[\s\S]*?Borinquen[\s\S]*?<\/p>/g, '');
  }
  
  // REMOVE broken bullet points
  desc = desc.replace(/<li>horses and riders<\/li>/g, '');
  desc = desc.replace(/<li>in equestrian sports<\/li>/g, '');
  desc = desc.replace(/<li><strong>Value:<\/strong>\s*<\/li>/g, '');
  
  // REMOVE empty HTML elements
  desc = desc.replace(/<ul>\s*<\/ul>/g, '');
  desc = desc.replace(/<li>\s*<\/li>/g, '');
  desc = desc.replace(/<p>\s*<\/p>/g, '');
  desc = desc.replace(/<h3>\s*<\/h3>/g, '');
  
  // REMOVE broken fragments
  desc = desc.replace(/<p>[,\-\s\.]+<\/p>/g, '');
  
  // Clean up whitespace
  desc = desc.replace(/\n{3,}/g, '\n\n');
  desc = desc.trim();
  
  // If we removed content and it's now too short, add basic content
  const textContent = desc.replace(/<[^>]+>/g, '').trim();
  if (textContent.length < 100) {
    desc = `<h2>${row.h1_title}</h2>\n<p>Browse our selection of quality ${row.h1_title.toLowerCase()} from trusted equestrian brands. Carefully curated products with fast shipping Australia-wide.</p>`;
  }
  
  if (desc !== originalDesc) {
    row.long_description = desc;
    return { fixed: true, reason: 'Removed broken/irrelevant content' };
  }
  
  return { fixed: false };
}

function fixShortDescription(row: CsvRow): { fixed: boolean; reason?: string } {
  let desc = row.short_description;
  const originalDesc = desc;
  
  // Remove category prefix
  desc = desc.replace(/^[a-z\s]+:\s*/i, '');
  
  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  
  if (desc !== originalDesc) {
    row.short_description = desc;
    return { fixed: true, reason: 'Fixed capitalization/prefix' };
  }
  
  return { fixed: false };
}

// ============================================================================
// WIKIPEDIA: Only use if relevant
// ============================================================================

async function fetchWikipedia(searchTerm: string) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.query?.search || searchData.query.search.length === 0) {
      return null;
    }
    
    const pageTitle = searchData.query.search[0].title;
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    const contentResponse = await fetch(contentUrl);
    const contentData = await contentResponse.json();
    
    const pages = contentData.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    if (!page || page.missing) return null;
    
    return {
      title: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: page.extract || '',
    };
  } catch (error) {
    return null;
  }
}

function generateSearchTerms(row: CsvRow): string[] {
  const terms: string[] = [];
  
  // Be more specific with search terms
  if (row.url_path.includes('saddle')) {
    terms.push('saddle (tack)');
    terms.push('horse saddle');
  } else if (row.url_path.includes('halter') || row.url_path.includes('headstall')) {
    terms.push('halter (horse)');
    terms.push('horse halter');
  } else if (row.url_path.includes('lead') && row.url_path.includes('horse')) {
    terms.push('lead rope');
    terms.push('horse lead');
  } else if (row.url_path.includes('rug')) {
    terms.push('horse blanket');
    terms.push('horse rug');
  } else if (row.url_path.includes('helmet')) {
    terms.push('equestrian helmet');
    terms.push('riding helmet');
  } else if (row.url_path.includes('breech')) {
    terms.push('breeches');
    terms.push('riding breeches');
  } else if (row.url_path.includes('boot')) {
    if (row.url_path.includes('horse')) {
      terms.push('horse boot');
    } else {
      terms.push('riding boot');
    }
  } else {
    // Generic search
    terms.push(`${row.h1_title} equestrian`);
    terms.push(`${row.h1_title} horse`);
  }
  
  return terms;
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, dryRun: boolean) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 ${row.url_path}`);
  console.log(`   ${row.h1_title}`);
  console.log(`${'='.repeat(80)}`);
  
  const fixes: string[] = [];
  
  // Step 1: Fix meta description
  const metaFix = fixMetaDescription(row);
  if (metaFix.fixed) {
    fixes.push(`meta_description: ${metaFix.reason}`);
    console.log(`   ✅ Fixed meta_description: ${metaFix.reason}`);
    if (dryRun) {
      console.log(`      New: ${row.meta_description.substring(0, 100)}...`);
    }
  }
  
  // Step 2: Clean long description
  const longFix = cleanLongDescription(row);
  if (longFix.fixed) {
    fixes.push(`long_description: ${longFix.reason}`);
    console.log(`   ✅ Fixed long_description: ${longFix.reason}`);
  }
  
  // Step 3: Fix short description
  const shortFix = fixShortDescription(row);
  if (shortFix.fixed) {
    fixes.push(`short_description: ${shortFix.reason}`);
    console.log(`   ✅ Fixed short_description: ${shortFix.reason}`);
  }
  
  // Step 4: Check Wikipedia (but don't blindly add content)
  const searchTerms = generateSearchTerms(row);
  let relevantWiki = null;
  
  for (const term of searchTerms) {
    const wikiData = await fetchWikipedia(term);
    if (wikiData && isRelevantWikipediaMatch(wikiData.title, row.h1_title, row.url_path)) {
      relevantWiki = wikiData;
      console.log(`   📖 Relevant Wikipedia: ${wikiData.title}`);
      console.log(`      ${wikiData.url}`);
      break;
    }
  }
  
  if (!relevantWiki) {
    console.log(`   ℹ️  No relevant Wikipedia page found`);
  }
  
  if (fixes.length === 0) {
    console.log(`   ✓ No fixes needed`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  
  return { fixes, relevantWiki };
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
  
  console.log(`\n🔧 Smart Content Fixer`);
  console.log(`   Processing: ${endRow - startRow} pages (rows ${startRow}-${endRow - 1})`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will apply changes)'}`);
  console.log('');
  
  let fixedCount = 0;
  let wikiFoundCount = 0;
  
  // Process each page
  for (let i = startRow; i < endRow; i++) {
    const result = await processPage(rows[i], dryRun);
    
    if (result.fixes.length > 0) {
      fixedCount++;
    }
    
    if (result.relevantWiki) {
      wikiFoundCount++;
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`   Pages processed: ${endRow - startRow}`);
  console.log(`   Pages fixed: ${fixedCount}`);
  console.log(`   Relevant Wikipedia found: ${wikiFoundCount}`);
  
  if (!dryRun) {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-smart-fix-${timestamp}.csv`);
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
