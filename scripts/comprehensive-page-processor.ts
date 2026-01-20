#!/usr/bin/env tsx

/**
 * Comprehensive Page-by-Page Content Processor
 * 
 * For each page:
 * 1. Fetch Wikipedia data for entities/context
 * 2. Validate content quality (identify issues)
 * 3. Auto-fix issues (grammar, structure, etc.)
 * 4. Enrich with Wikipedia entities
 * 5. Show before/after comparison
 * 6. Save changes
 * 7. Move to next page
 * 
 * Usage:
 *   npm run process-pages -- --start=0 --max=10     (process 10 pages from start)
 *   npm run process-pages -- --start=50 --max=20    (process 20 pages from row 50)
 *   npm run process-pages -- --auto                 (auto-fix without prompts)
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

interface WikipediaData {
  found: boolean;
  title?: string;
  url?: string;
  extract?: string;
  entities?: string[];
  keyTerms?: string[];
}

interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
}

interface ProcessingResult {
  url: string;
  wikiData: WikipediaData;
  issues: ValidationIssue[];
  fixesApplied: string[];
  beforeScore: number;
  afterScore: number;
}

// ============================================================================
// WIKIPEDIA FUNCTIONS
// ============================================================================

async function fetchWikipedia(searchTerm: string): Promise<WikipediaData> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.query?.search || searchData.query.search.length === 0) {
      return { found: false };
    }
    
    const pageTitle = searchData.query.search[0].title;
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    const contentResponse = await fetch(contentUrl);
    const contentData = await contentResponse.json();
    
    const pages = contentData.query?.pages;
    if (!pages) return { found: false };
    
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    if (!page || page.missing) return { found: false };
    
    const extract = page.extract || '';
    const entities = extractEntities(extract);
    const keyTerms = extractKeyTerms(extract);
    
    return {
      found: true,
      title: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: extract.substring(0, 600),
      entities,
      keyTerms,
    };
  } catch (error) {
    return { found: false };
  }
}

function extractEntities(text: string): string[] {
  const entities: Set<string> = new Set();
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = text.match(capitalizedPattern) || [];
  
  matches.forEach(match => {
    if (!['The', 'A', 'An', 'In', 'On', 'At', 'To', 'For', 'Of', 'With', 'This', 'These', 'Those'].includes(match)) {
      entities.add(match);
    }
  });
  
  return Array.from(entities).slice(0, 10);
}

function extractKeyTerms(text: string): string[] {
  const terms: Set<string> = new Set();
  const equestrianTerms = [
    'dressage', 'jumping', 'eventing', 'endurance', 'western', 'english',
    'saddle', 'bridle', 'bit', 'girth', 'stirrup', 'rein', 'halter',
    'leather', 'synthetic', 'waterproof', 'breathable', 'grip',
    'competition', 'training', 'riding', 'horse', 'rider', 'equestrian',
    'safety', 'certified', 'standard', 'protection', 'helmet',
    'comfort', 'fit', 'sizing', 'measurement', 'discipline',
    'turnout', 'stable', 'rug', 'blanket', 'sheet', 'cooler',
  ];
  
  const lowerText = text.toLowerCase();
  equestrianTerms.forEach(term => {
    if (lowerText.includes(term)) terms.add(term);
  });
  
  return Array.from(terms);
}

function generateSearchTerms(row: CsvRow): string[] {
  const terms: string[] = [];
  
  terms.push(`${row.h1_title} equestrian`);
  
  if (row.url_path.includes('saddle')) {
    terms.push('saddle (tack)');
    terms.push('horse saddle');
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
      terms.push('leg protection horse');
    } else {
      terms.push('riding boot');
      terms.push('equestrian footwear');
    }
  }
  
  terms.push(row.h1_title);
  return terms;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateContent(row: CsvRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Meta description
  if (row.meta_description.length < 120) {
    issues.push({ field: 'meta_description', issue: `Too short (${row.meta_description.length} chars)`, severity: 'warning' });
  }
  if (row.meta_description.includes('helmets, boots, gloves') && !row.url_path.includes('rider') && !row.url_path.includes('helmet') && !row.url_path.includes('boot')) {
    issues.push({ field: 'meta_description', issue: 'Mentions wrong products', severity: 'critical' });
  }
  
  // Long description
  if (row.long_description.includes('<ul></ul>') || row.long_description.includes('<li></li>')) {
    issues.push({ field: 'long_description', issue: 'Contains empty HTML elements', severity: 'critical' });
  }
  if (row.long_description.match(/<p>[,\-\s\.]+<\/p>/)) {
    issues.push({ field: 'long_description', issue: 'Contains broken text fragments', severity: 'critical' });
  }
  
  const textContent = row.long_description.replace(/<[^>]+>/g, '').trim();
  if (textContent.length < 150) {
    issues.push({ field: 'long_description', issue: `Content too sparse (${textContent.length} chars)`, severity: 'warning' });
  }
  
  // Short description
  if (row.short_description && row.short_description[0] !== row.short_description[0].toUpperCase()) {
    issues.push({ field: 'short_description', issue: 'Does not start with capital', severity: 'warning' });
  }
  
  // FAQs
  try {
    const faqs = JSON.parse(row.faq_json || '[]');
    const isAccessory = row.url_path.includes('luggage') || row.url_path.includes('handbag') || 
                       row.url_path.includes('giftware') || row.url_path.includes('jewellery');
    
    if (isAccessory && faqs.some((f: any) => f.answer.includes('Safety should always come first'))) {
      issues.push({ field: 'faq_json', issue: 'Inappropriate safety FAQs for accessories', severity: 'critical' });
    }
  } catch (e) {
    issues.push({ field: 'faq_json', issue: 'Invalid JSON', severity: 'critical' });
  }
  
  return issues;
}

function calculateScore(issues: ValidationIssue[]): number {
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 20;
    else if (issue.severity === 'warning') score -= 5;
  });
  return Math.max(0, score);
}

// ============================================================================
// FIX FUNCTIONS
// ============================================================================

function fixMetaDescription(row: CsvRow, wikiData: WikipediaData): boolean {
  let fixed = false;
  
  // Fix wrong product mentions
  if (row.meta_description.includes('helmets, boots, gloves and safety vests')) {
    const isEquipment = row.url_path.includes('helmet') || row.url_path.includes('boot') || row.url_path.includes('glove');
    if (!isEquipment) {
      if (wikiData.found && wikiData.keyTerms && wikiData.keyTerms.length > 0) {
        const terms = wikiData.keyTerms.slice(0, 3).join(', ');
        row.meta_description = `Shop quality ${row.h1_title.toLowerCase()} for ${terms}. Premium products from trusted brands. Free shipping Australia-wide. Expert advice available.`;
      } else {
        row.meta_description = `Shop premium ${row.h1_title.toLowerCase()} from top brands. Free shipping Australia-wide. Expert advice available. Find the perfect gear for your needs.`;
      }
      fixed = true;
    }
  }
  
  // Ensure proper length
  if (row.meta_description.length < 120 || row.meta_description.length > 160) {
    if (wikiData.found && wikiData.keyTerms && wikiData.keyTerms.length > 0) {
      const terms = wikiData.keyTerms.slice(0, 2).join(' and ');
      row.meta_description = `Shop premium ${row.h1_title.toLowerCase()} for ${terms}. Quality products from top brands. Free shipping Australia-wide. Expert advice available.`;
    } else {
      row.meta_description = `Shop premium ${row.h1_title.toLowerCase()} from top brands. Free shipping Australia-wide. Expert advice available. Find the perfect gear for your needs.`;
    }
    fixed = true;
  }
  
  return fixed;
}

function fixLongDescription(row: CsvRow, wikiData: WikipediaData): boolean {
  let fixed = false;
  let desc = row.long_description;
  
  // Remove empty/broken elements
  const before = desc;
  desc = desc.replace(/<ul>\s*<\/ul>/g, '');
  desc = desc.replace(/<li>\s*<\/li>/g, '');
  desc = desc.replace(/<p>\s*<\/p>/g, '');
  desc = desc.replace(/<p>[,\-\s\.]+<\/p>/g, '');
  desc = desc.replace(/<h3>\s*<\/h3>/g, '');
  
  if (desc !== before) {
    row.long_description = desc;
    fixed = true;
  }
  
  // If content is sparse, enrich with Wikipedia
  const textContent = desc.replace(/<[^>]+>/g, '').trim();
  if (textContent.length < 150 && wikiData.found && wikiData.extract) {
    const sentences = wikiData.extract.match(/[^.!?]+[.!?]+/g) || [];
    const intro = sentences.slice(0, 2).join(' ');
    
    const enrichedContent = `<h2>${row.h1_title}</h2>
<p>${intro}</p>
<p>Browse our selection of quality ${row.h1_title.toLowerCase()} from trusted brands. ${wikiData.keyTerms && wikiData.keyTerms.length > 0 ? 'Available for ' + wikiData.keyTerms.slice(0, 3).join(', ') + '.' : ''} Free shipping Australia-wide.</p>`;
    
    row.long_description = enrichedContent;
    fixed = true;
  }
  
  return fixed;
}

function fixFAQs(row: CsvRow): boolean {
  try {
    const faqs = JSON.parse(row.faq_json || '[]');
    const isAccessory = row.url_path.includes('luggage') || row.url_path.includes('handbag') || 
                       row.url_path.includes('giftware') || row.url_path.includes('jewellery');
    
    if (isAccessory && faqs.some((f: any) => f.answer.includes('Safety should always come first'))) {
      const newFaqs = [
        {
          question: `What ${row.h1_title.toLowerCase()} do you stock?`,
          answer: `We stock a range of quality ${row.h1_title.toLowerCase()} suitable for equestrians. Browse our collection to see available styles and options.`,
        },
        {
          question: 'Do you offer free shipping?',
          answer: 'Yes! We offer free shipping on all orders within Australia. Orders are typically dispatched within 24 hours.',
        },
      ];
      row.faq_json = JSON.stringify(newFaqs);
      return true;
    }
  } catch (e) {
    // Skip
  }
  return false;
}

function fixShortDescription(row: CsvRow): boolean {
  let desc = row.short_description;
  const before = desc;
  
  desc = desc.replace(/^[a-z\s]+:\s*/i, '');
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  
  if (desc !== before) {
    row.short_description = desc;
    return true;
  }
  return false;
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow): Promise<ProcessingResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Processing: ${row.url_path}`);
  console.log(`   Title: ${row.h1_title}`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Step 1: Fetch Wikipedia data
  console.log('🔍 Step 1: Fetching Wikipedia data...');
  const searchTerms = generateSearchTerms(row);
  let wikiData: WikipediaData = { found: false };
  
  for (const term of searchTerms) {
    wikiData = await fetchWikipedia(term);
    if (wikiData.found) {
      console.log(`   ✅ Found: ${wikiData.title}`);
      console.log(`   📖 URL: ${wikiData.url}`);
      if (wikiData.entities && wikiData.entities.length > 0) {
        console.log(`   🏷️  Entities: ${wikiData.entities.slice(0, 5).join(', ')}`);
      }
      if (wikiData.keyTerms && wikiData.keyTerms.length > 0) {
        console.log(`   🔑 Key terms: ${wikiData.keyTerms.join(', ')}`);
      }
      break;
    }
  }
  
  if (!wikiData.found) {
    console.log(`   ❌ No Wikipedia page found`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  
  // Step 2: Validate content
  console.log('\n✓ Step 2: Validating content...');
  const issuesBefore = validateContent(row);
  const scoreBefore = calculateScore(issuesBefore);
  
  console.log(`   Score: ${scoreBefore}/100`);
  if (issuesBefore.length > 0) {
    console.log(`   Issues found: ${issuesBefore.length}`);
    issuesBefore.forEach(issue => {
      const icon = issue.severity === 'critical' ? '🔴' : '🟡';
      console.log(`   ${icon} ${issue.field}: ${issue.issue}`);
    });
  } else {
    console.log(`   ✅ No issues found`);
  }
  
  // Step 3: Apply fixes
  console.log('\n🔧 Step 3: Applying fixes...');
  const fixesApplied: string[] = [];
  
  if (fixMetaDescription(row, wikiData)) {
    fixesApplied.push('meta_description');
    console.log(`   ✅ Fixed meta_description`);
  }
  if (fixLongDescription(row, wikiData)) {
    fixesApplied.push('long_description');
    console.log(`   ✅ Fixed long_description`);
  }
  if (fixFAQs(row)) {
    fixesApplied.push('faq_json');
    console.log(`   ✅ Fixed faq_json`);
  }
  if (fixShortDescription(row)) {
    fixesApplied.push('short_description');
    console.log(`   ✅ Fixed short_description`);
  }
  
  if (fixesApplied.length === 0) {
    console.log(`   ℹ️  No fixes needed`);
  }
  
  // Step 4: Re-validate
  console.log('\n✓ Step 4: Re-validating...');
  const issuesAfter = validateContent(row);
  const scoreAfter = calculateScore(issuesAfter);
  
  console.log(`   Score: ${scoreBefore}/100 → ${scoreAfter}/100 ${scoreAfter > scoreBefore ? '📈' : scoreAfter === scoreBefore ? '➡️' : '📉'}`);
  
  if (issuesAfter.length > 0) {
    console.log(`   Remaining issues: ${issuesAfter.length}`);
  } else {
    console.log(`   ✅ All issues resolved`);
  }
  
  return {
    url: row.url_path,
    wikiData,
    issues: issuesBefore,
    fixesApplied,
    beforeScore: scoreBefore,
    afterScore: scoreAfter,
  };
}

async function main() {
  const args = process.argv.slice(2);
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
  
  console.log(`\n🚀 Processing ${endRow - startRow} pages (rows ${startRow} to ${endRow - 1})...\n`);
  
  const results: ProcessingResult[] = [];
  
  // Process each page
  for (let i = startRow; i < endRow; i++) {
    const result = await processPage(rows[i]);
    results.push(result);
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 PROCESSING SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Total pages processed: ${results.length}`);
  console.log(`Wikipedia pages found: ${results.filter(r => r.wikiData.found).length}`);
  console.log(`Pages with issues: ${results.filter(r => r.issues.length > 0).length}`);
  console.log(`Pages fixed: ${results.filter(r => r.fixesApplied.length > 0).length}`);
  
  const avgScoreBefore = results.reduce((sum, r) => sum + r.beforeScore, 0) / results.length;
  const avgScoreAfter = results.reduce((sum, r) => sum + r.afterScore, 0) / results.length;
  
  console.log(`\nAverage score: ${avgScoreBefore.toFixed(1)}/100 → ${avgScoreAfter.toFixed(1)}/100`);
  
  // Create backup and save
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = CSV_PATH.replace('.csv', `.backup-processed-${timestamp}.csv`);
  fs.copyFileSync(CSV_PATH, backupPath);
  console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);
  
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
  console.log(`✅ Changes applied to ${path.basename(CSV_PATH)}`);
  console.log(`\n✨ Done!\n`);
}

main().catch(console.error);
