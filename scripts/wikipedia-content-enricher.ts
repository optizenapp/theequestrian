#!/usr/bin/env tsx

/**
 * Wikipedia Content Enricher
 * 
 * For each category page:
 * 1. Searches Wikipedia for relevant articles
 * 2. Extracts key entities, terms, and information
 * 3. Enriches content with proper NLP entities
 * 4. Validates and fixes content issues
 * 5. Generates better descriptions using Wikipedia context
 * 
 * Uses Wikipedia API (no scraping needed):
 * - Search API: Find relevant articles
 * - Parse API: Get clean text and extract info
 * - No rate limits for reasonable use
 * 
 * Usage:
 *   npm run enrich-content -- --check-only    (check what Wikipedia pages exist)
 *   npm run enrich-content -- --enrich        (enrich content with Wikipedia data)
 *   npm run enrich-content -- --start=50      (start from row 50)
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

interface WikipediaResult {
  found: boolean;
  title?: string;
  url?: string;
  extract?: string;
  entities?: string[];
  keyTerms?: string[];
}

/**
 * Search Wikipedia for a topic
 */
async function searchWikipedia(searchTerm: string): Promise<WikipediaResult> {
  try {
    // Wikipedia API endpoint
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.query?.search || searchData.query.search.length === 0) {
      return { found: false };
    }
    
    // Get the first result
    const firstResult = searchData.query.search[0];
    const pageTitle = firstResult.title;
    
    // Get page content
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    
    const contentResponse = await fetch(contentUrl);
    const contentData = await contentResponse.json();
    
    const pages = contentData.query?.pages;
    if (!pages) {
      return { found: false };
    }
    
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    if (!page || page.missing) {
      return { found: false };
    }
    
    // Extract key information
    const extract = page.extract || '';
    const entities = extractEntities(extract);
    const keyTerms = extractKeyTerms(extract);
    
    return {
      found: true,
      title: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: extract.substring(0, 500), // First 500 chars
      entities,
      keyTerms,
    };
  } catch (error) {
    console.error(`Error fetching Wikipedia for "${searchTerm}":`, error);
    return { found: false };
  }
}

/**
 * Extract named entities from text (simple version)
 */
function extractEntities(text: string): string[] {
  const entities: Set<string> = new Set();
  
  // Look for capitalized words/phrases (likely proper nouns)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = text.match(capitalizedPattern) || [];
  
  matches.forEach(match => {
    // Filter out common words
    if (!['The', 'A', 'An', 'In', 'On', 'At', 'To', 'For', 'Of', 'With'].includes(match)) {
      entities.add(match);
    }
  });
  
  return Array.from(entities).slice(0, 10); // Top 10 entities
}

/**
 * Extract key terms from text
 */
function extractKeyTerms(text: string): string[] {
  const terms: Set<string> = new Set();
  
  // Common equestrian terms to look for
  const equestrianTerms = [
    'dressage', 'jumping', 'eventing', 'endurance', 'western', 'english',
    'saddle', 'bridle', 'bit', 'girth', 'stirrup', 'rein',
    'leather', 'synthetic', 'waterproof', 'breathable',
    'competition', 'training', 'riding', 'horse', 'rider',
    'safety', 'certified', 'standard', 'protection',
    'comfort', 'fit', 'sizing', 'measurement',
  ];
  
  const lowerText = text.toLowerCase();
  
  equestrianTerms.forEach(term => {
    if (lowerText.includes(term)) {
      terms.add(term);
    }
  });
  
  return Array.from(terms);
}

/**
 * Generate search terms for Wikipedia based on category
 */
function generateWikipediaSearchTerms(row: CsvRow): string[] {
  const searchTerms: string[] = [];
  const urlSegments = row.url_path.split('/').filter(s => s);
  
  // Main search term based on h1_title
  searchTerms.push(`${row.h1_title} equestrian`);
  searchTerms.push(row.h1_title);
  
  // Add context-specific terms
  if (row.url_path.includes('saddle')) {
    searchTerms.push('saddle (tack)');
    searchTerms.push('horse saddle');
  }
  
  if (row.url_path.includes('rug')) {
    searchTerms.push('horse blanket');
    searchTerms.push('horse rug');
  }
  
  if (row.url_path.includes('helmet')) {
    searchTerms.push('equestrian helmet');
    searchTerms.push('riding helmet');
  }
  
  if (row.url_path.includes('breech')) {
    searchTerms.push('breeches');
    searchTerms.push('riding breeches');
  }
  
  if (row.url_path.includes('boot') && row.url_path.includes('horse')) {
    searchTerms.push('horse boot');
    searchTerms.push('leg protection horse');
  }
  
  if (row.url_path.includes('boot') && row.url_path.includes('rider')) {
    searchTerms.push('riding boot');
    searchTerms.push('equestrian footwear');
  }
  
  return searchTerms;
}

/**
 * Enrich content using Wikipedia data
 */
function enrichContent(row: CsvRow, wikiData: WikipediaResult): boolean {
  if (!wikiData.found || !wikiData.extract) {
    return false;
  }
  
  let enriched = false;
  
  // Enrich long_description if it's sparse
  const textContent = row.long_description.replace(/<[^>]+>/g, '').trim();
  
  if (textContent.length < 200 && wikiData.extract) {
    // Extract first 2-3 sentences from Wikipedia
    const sentences = wikiData.extract.match(/[^.!?]+[.!?]+/g) || [];
    const intro = sentences.slice(0, 2).join(' ');
    
    // Create enriched content
    const enrichedContent = `<h2>${row.h1_title}</h2>
<p>${intro}</p>
<p>Browse our selection of quality ${row.h1_title.toLowerCase()} from trusted brands. ${wikiData.keyTerms && wikiData.keyTerms.length > 0 ? 'Available in various styles including ' + wikiData.keyTerms.slice(0, 3).join(', ') + '.' : ''} Free shipping Australia-wide.</p>`;
    
    row.long_description = enrichedContent;
    enriched = true;
  }
  
  // Enrich meta_description with entities
  if (row.meta_description.length < 140 && wikiData.keyTerms && wikiData.keyTerms.length > 0) {
    const terms = wikiData.keyTerms.slice(0, 3).join(', ');
    row.meta_description = `Shop premium ${row.h1_title.toLowerCase()} for ${terms}. Quality products from top brands. Free shipping Australia-wide. Expert advice available.`;
    enriched = true;
  }
  
  return enriched;
}

/**
 * Main processing function
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldEnrich = args.includes('--enrich');
  const checkOnly = args.includes('--check-only');
  const startRow = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
  const maxRows = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '999999');
  
  if (!shouldEnrich && !checkOnly) {
    console.error('❌ Error: Must specify either --enrich or --check-only');
    console.log('\nUsage:');
    console.log('  npm run enrich-content -- --check-only    (check Wikipedia availability)');
    console.log('  npm run enrich-content -- --enrich        (enrich content)');
    console.log('  npm run enrich-content -- --start=50      (start from row 50)');
    console.log('  npm run enrich-content -- --max=20        (process max 20 rows)');
    process.exit(1);
  }
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRow[];
  
  const endRow = Math.min(startRow + maxRows, rows.length);
  
  console.log(`\n🔍 Processing ${endRow - startRow} pages (rows ${startRow} to ${endRow})...\n`);
  
  const results: Array<{ url: string; title: string; wiki: WikipediaResult }> = [];
  let enrichedCount = 0;
  
  // Process each row
  for (let i = startRow; i < endRow; i++) {
    const row = rows[i];
    
    console.log(`\n📄 [${i + 1}/${rows.length}] ${row.url_path}`);
    console.log(`   Title: ${row.h1_title}`);
    
    // Generate search terms
    const searchTerms = generateWikipediaSearchTerms(row);
    console.log(`   Searching Wikipedia: ${searchTerms[0]}`);
    
    // Try to find Wikipedia page
    let wikiData: WikipediaResult = { found: false };
    
    for (const searchTerm of searchTerms) {
      wikiData = await searchWikipedia(searchTerm);
      
      if (wikiData.found) {
        console.log(`   ✅ Found: ${wikiData.title}`);
        console.log(`   📖 URL: ${wikiData.url}`);
        
        if (wikiData.entities && wikiData.entities.length > 0) {
          console.log(`   🏷️  Entities: ${wikiData.entities.slice(0, 5).join(', ')}`);
        }
        
        if (wikiData.keyTerms && wikiData.keyTerms.length > 0) {
          console.log(`   🔑 Key terms: ${wikiData.keyTerms.join(', ')}`);
        }
        
        break; // Found a match, stop searching
      }
    }
    
    if (!wikiData.found) {
      console.log(`   ❌ No Wikipedia page found`);
    }
    
    results.push({
      url: row.url_path,
      title: row.h1_title,
      wiki: wikiData,
    });
    
    // Enrich content if requested
    if (shouldEnrich && wikiData.found) {
      const wasEnriched = enrichContent(row, wikiData);
      if (wasEnriched) {
        enrichedCount++;
        console.log(`   ✨ Content enriched`);
      }
    }
    
    // Rate limiting - be nice to Wikipedia
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }
  
  // Summary
  console.log(`\n\n📊 Summary:\n`);
  console.log(`   Total processed: ${results.length}`);
  console.log(`   Wikipedia pages found: ${results.filter(r => r.wiki.found).length}`);
  console.log(`   Pages enriched: ${enrichedCount}`);
  
  // Show pages without Wikipedia
  const noWiki = results.filter(r => !r.wiki.found);
  if (noWiki.length > 0) {
    console.log(`\n\n❌ Pages without Wikipedia (${noWiki.length}):\n`);
    noWiki.slice(0, 10).forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.url} - ${r.title}`);
    });
    if (noWiki.length > 10) {
      console.log(`   ... and ${noWiki.length - 10} more`);
    }
  }
  
  if (shouldEnrich && enrichedCount > 0) {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-enriched-${timestamp}.csv`);
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
  
  console.log(`\n✨ Done!\n`);
}

main().catch(console.error);
