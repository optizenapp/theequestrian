/**
 * Generate Master Content CSV
 * 
 * Creates a comprehensive content management file (collection-content.csv)
 * based on the sitemap and mapping data, incorporating SEO and Entity-First principles.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Paths
const SITEMAP_PATH = path.join(process.cwd(), 'exports', 'sitemap-current.csv');
const MAPPING_PATH = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');

// Interface for Sitemap Row
interface SitemapRow {
  'Top Level': string;
  'Subcategory': string;
  'Sub-subcategory': string;
  'Complete URL': string;
}

// Interface for Mapping Row
interface MappingRow {
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
  action: string;
}

// Interface for Output Row
interface ContentRow {
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  breadcrumb_label: string;
  parent_url: string;
  category_level: number;
  status: string;
  default_sort: string;
  faq_json: string;
  related_categories_json: string;
}

// Helper to clean titles
function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^(STABLE:|HORSE:|RIDER:|CLOTHING:|PET:|ACCESSORIES:)\s*/i, '') // Remove prefixes
    .trim();
}

// Helper to get breadcrumb label (short version)
function getBreadcrumbLabel(h1: string, url: string): string {
  // If h1 is long, maybe use the last part of URL? 
  // For now, let's use the H1 but maybe truncate if needed
  // Actually, typically H1 is fine unless it's very long
  return h1;
}

// Helper to generate SEO Title
function generateMetaTitle(h1: string, level: number): string {
  const brand = 'The Equestrian';
  let modifier = '';

  switch (level) {
    case 1:
      modifier = 'Shop Online';
      break;
    case 2:
      modifier = 'Buy Online';
      break;
    case 3:
      modifier = 'Premium Quality';
      break;
    default:
      modifier = 'Shop Online';
  }

  // Ensure length is good (approx 60 chars max usually, but brand takes space)
  // {H1} | {Modifier} | {Brand}
  return `${h1} | ${modifier} | ${brand}`;
}

// Helper to generate Meta Description
function generateMetaDescription(h1: string, category: string): string {
  // Template: Shop {H1} at The Equestrian. {Benefit}. {Range}. Free shipping over $100.
  
  let benefit = 'Quality equipment for horse and rider';
  if (category === 'horse') benefit = 'Durable and comfortable gear for your horse';
  if (category === 'rider') benefit = 'Stylish and functional riding apparel';
  if (category === 'pet') benefit = 'Premium supplies for your pets';
  if (category === 'clothing') benefit = 'Fashionable equestrian clothing';

  return `Shop ${h1} at The Equestrian. ${benefit}. Wide range of top brands available. Free shipping over $100.`;
}

// Helper to generate Short Description (Micro-Guide)
function generateShortDescription(h1: string, category: string): string {
  return `Browse our extensive range of ${h1.toLowerCase()}. Expertly selected for quality, durability, and performance. Whether you're competing or riding for leisure, find exactly what you need at The Equestrian.`;
}

async function main() {
  console.log('🚀 Starting Content CSV Generation...');

  // 1. Read Input Files
  const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const sitemap = csv.parse(sitemapContent, { columns: true, skip_empty_lines: true }) as SitemapRow[];
  
  const mappingContent = fs.readFileSync(MAPPING_PATH, 'utf-8');
  const mapping = csv.parse(mappingContent, { columns: true, skip_empty_lines: true }) as MappingRow[];

  // Create lookup for product types
  const typeLookup = new Map<string, string>();
  mapping.forEach(row => {
    // Build path key
    const parts = [row.top_level];
    if (row.parent_category) parts.push(row.parent_category);
    if (row.subcategory_handle) parts.push(row.subcategory_handle);
    const key = '/' + parts.join('/');
    
    // Store product type for this path
    if (row.product_type && !typeLookup.has(key)) {
      typeLookup.set(key, row.product_type);
    }
  });

  // 2. Process Rows
  const outputRows: ContentRow[] = [];

  for (const page of sitemap) {
    const url = page['Complete URL'];
    
    // Determine level and parent
    const parts = url.split('/').filter(Boolean);
    const level = parts.length;
    const parentUrl = level > 1 ? '/' + parts.slice(0, -1).join('/') : '/';
    const category = parts[0]; // 'horse', 'rider', etc.

    // Get raw title from mapping or fallback to URL slug
    let rawTitle = typeLookup.get(url);
    if (!rawTitle) {
      // Fallback: Use last URL segment formatted
      const slug = parts[parts.length - 1];
      rawTitle = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Clean Title (H1)
    const h1Title = cleanTitle(rawTitle);

    // Generate Content
    const row: ContentRow = {
      url_path: url,
      h1_title: h1Title,
      meta_title: generateMetaTitle(h1Title, level),
      meta_description: generateMetaDescription(h1Title, category),
      short_description: generateShortDescription(h1Title, category),
      breadcrumb_label: getBreadcrumbLabel(h1Title, url),
      parent_url: parentUrl,
      category_level: level,
      status: 'published',
      default_sort: 'best-selling',
      faq_json: '[]',
      related_categories_json: '[]' // Will populate later if needed
    };

    outputRows.push(row);
  }

  // 3. Write Output
  const csvString = stringify(outputRows, { header: true });
  fs.writeFileSync(OUTPUT_PATH, csvString);

  console.log(`✅ Generated content for ${outputRows.length} pages at ${OUTPUT_PATH}`);
}

main().catch(console.error);




