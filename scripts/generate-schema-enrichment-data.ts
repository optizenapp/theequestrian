#!/usr/bin/env tsx

/**
 * Generate Schema Enrichment Data from Wikipedia
 * 
 * Creates a JSON file with schema enrichment data that can be used
 * to enhance CollectionPage schema with:
 * - sameAs: Wikipedia URL for entity linking
 * - keywords: Extracted from Wikipedia
 * - about: Semantic topics/entities
 * - additionalType: More specific schema.org types
 * 
 * This does NOT modify existing schema - it generates supplementary data
 * that can be optionally added to collection-schema-fast.ts
 * 
 * Output: exports/schema-enrichment.json
 * 
 * Usage:
 *   npm run generate-schema-data -- --start=0 --max=50
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const CSV_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'exports', 'schema-enrichment.json');

interface CsvRow {
  url_path: string;
  h1_title: string;
  [key: string]: string;
}

interface SchemaEnrichment {
  url_path: string;
  h1_title: string;
  sameAs?: string; // Wikipedia URL
  keywords?: string[]; // From Wikipedia
  about?: Array<{ type: string; name: string }>; // Entities
  additionalType?: string; // More specific schema.org type
  mentions?: string[]; // Brand names, related terms
}

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

function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();
  
  const equestrianTerms = [
    'dressage', 'jumping', 'eventing', 'endurance', 'western', 'english',
    'saddle', 'bridle', 'bit', 'girth', 'stirrup', 'rein', 'halter',
    'leather', 'synthetic', 'waterproof', 'breathable', 'grip',
    'competition', 'training', 'riding', 'horse', 'rider', 'equestrian',
    'safety', 'certified', 'standard', 'protection', 'helmet',
    'comfort', 'fit', 'sizing', 'measurement', 'discipline',
    'turnout', 'stable', 'rug', 'blanket', 'sheet', 'cooler',
    'boot', 'footwear', 'apparel', 'clothing', 'breeches',
  ];
  
  const lowerText = text.toLowerCase();
  equestrianTerms.forEach(term => {
    if (lowerText.includes(term)) keywords.add(term);
  });
  
  return Array.from(keywords);
}

function extractEntities(text: string): Array<{ type: string; name: string }> {
  const entities: Array<{ type: string; name: string }> = [];
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = text.match(capitalizedPattern) || [];
  
  const seen = new Set<string>();
  matches.forEach(match => {
    if (!['The', 'A', 'An', 'In', 'On', 'At', 'To', 'For', 'Of', 'With', 'This', 'These'].includes(match)) {
      if (!seen.has(match)) {
        seen.add(match);
        entities.push({
          type: 'Thing',
          name: match,
        });
      }
    }
  });
  
  return entities.slice(0, 5); // Top 5 entities
}

function determineAdditionalType(urlPath: string): string | undefined {
  // Map URL paths to more specific schema.org types
  if (urlPath.includes('saddle')) return 'https://schema.org/Product';
  if (urlPath.includes('helmet')) return 'https://schema.org/Product';
  if (urlPath.includes('boot')) return 'https://schema.org/Product';
  if (urlPath.includes('clothing')) return 'https://schema.org/Product';
  if (urlPath.includes('rug')) return 'https://schema.org/Product';
  
  // Default CollectionPage doesn't need additionalType
  return undefined;
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
    } else {
      terms.push('riding boot');
      terms.push('equestrian footwear');
    }
  }
  
  terms.push(row.h1_title);
  return terms;
}

async function main() {
  const args = process.argv.slice(2);
  const startRow = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
  const maxRows = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '999999');
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRow[];
  
  const endRow = Math.min(startRow + maxRows, rows.length);
  
  console.log(`\n🔍 Generating schema enrichment data for ${endRow - startRow} pages...\n`);
  
  const enrichments: SchemaEnrichment[] = [];
  
  // Process each row
  for (let i = startRow; i < endRow; i++) {
    const row = rows[i];
    
    console.log(`[${i + 1}/${rows.length}] ${row.url_path}`);
    
    const searchTerms = generateSearchTerms(row);
    let wikiData = null;
    
    for (const term of searchTerms) {
      wikiData = await fetchWikipedia(term);
      if (wikiData) break;
    }
    
    if (wikiData) {
      console.log(`  ✅ Wikipedia: ${wikiData.title}`);
      
      const keywords = extractKeywords(wikiData.extract);
      const entities = extractEntities(wikiData.extract);
      const additionalType = determineAdditionalType(row.url_path);
      
      const enrichment: SchemaEnrichment = {
        url_path: row.url_path,
        h1_title: row.h1_title,
        sameAs: wikiData.url,
        keywords: keywords.length > 0 ? keywords : undefined,
        about: entities.length > 0 ? entities : undefined,
        additionalType,
      };
      
      enrichments.push(enrichment);
      
      console.log(`  🔑 Keywords: ${keywords.join(', ')}`);
      if (entities.length > 0) {
        console.log(`  🏷️  Entities: ${entities.map(e => e.name).join(', ')}`);
      }
    } else {
      console.log(`  ❌ No Wikipedia page found`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save to JSON file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enrichments, null, 2), 'utf-8');
  
  console.log(`\n✅ Generated ${enrichments.length} enrichments`);
  console.log(`📄 Saved to: ${OUTPUT_PATH}`);
  
  // Show sample usage
  console.log(`\n📖 Sample enrichment data:\n`);
  console.log(JSON.stringify(enrichments[0], null, 2));
  
  console.log(`\n💡 To use this data, import it in collection-schema-fast.ts:`);
  console.log(`   import schemaEnrichments from '@/exports/schema-enrichment.json';`);
  console.log(`   const enrichment = schemaEnrichments.find(e => e.url_path === collectionUrl);`);
  console.log(`   if (enrichment?.sameAs) collectionPageEntity.sameAs = enrichment.sameAs;`);
  
  console.log(`\n✨ Done!\n`);
}

main().catch(console.error);
