/**
 * Content Management for Collections
 * 
 * Reads content from the master CSV file (exports/collection-content.csv)
 * Handles H1s, SEO metadata, descriptions, and advanced features.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface RelatedCategory {
  url: string;
  title: string;
  description?: string;
}

export interface CollectionContent {
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  parent_url: string;
  category_level: number;
  status: string;
  default_sort: string;
  faq_items: FAQItem[];
  related_categories: RelatedCategory[];
}

// Interface for raw CSV row
interface CsvRow {
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  parent_url: string;
  category_level: string; // CSV reads as string
  status: string;
  default_sort: string;
  faq_json: string;
  related_categories_json: string;
}

// Cache for content
let contentCache: Map<string, CollectionContent> | null = null;
let lastModifiedTime: number | null = null;

/**
 * Load and parse the content CSV
 */
function loadContent(): Map<string, CollectionContent> {
  const csvPath = path.join(process.cwd(), 'exports', 'collection-content.csv');
  
  // Check if file has been modified (works in both dev and production)
  let currentModifiedTime: number | null = null;
  if (fs.existsSync(csvPath)) {
    const stats = fs.statSync(csvPath);
    currentModifiedTime = stats.mtimeMs;
  }
  
  // In development, always reload to pick up CSV changes.
  // In production, use the in-memory cache only if the CSV hasn't changed.
  if (process.env.NODE_ENV === 'production' && contentCache && lastModifiedTime === currentModifiedTime) {
    return contentCache;
  }
  
  if (!fs.existsSync(csvPath)) {
    console.warn(`Content CSV not found at: ${csvPath}`);
    return new Map();
  }

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];

    const contentMap = new Map<string, CollectionContent>();

    for (const row of records) {
      // Parse JSON fields safely
      let faq = [];
      let related = [];

      try {
        if (row.faq_json) faq = JSON.parse(row.faq_json);
        if (row.related_categories_json) related = JSON.parse(row.related_categories_json);
      } catch (e) {
        console.warn(`Failed to parse JSON for ${row.url_path}:`, e);
      }

      contentMap.set(row.url_path, {
        url_path: row.url_path,
        h1_title: row.h1_title,
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        short_description: row.short_description,
        long_description: row.long_description || '',
        breadcrumb_label: row.breadcrumb_label,
        parent_url: row.parent_url,
        category_level: parseInt(row.category_level, 10) || 1,
        status: row.status,
        default_sort: row.default_sort,
        faq_items: faq,
        related_categories: related,
      });
    }

    contentCache = contentMap;
    lastModifiedTime = currentModifiedTime;
    
    // Log cache refresh in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Content Cache] Loaded ${contentMap.size} collection entries from CSV`);
    }
    
    return contentMap;
  } catch (error) {
    console.error('Error loading content CSV:', error);
    return new Map();
  }
}

/**
 * Get content for a specific collection path
 */
export function getCollectionContent(urlPath: string): CollectionContent | null {
  const content = loadContent();
  // Ensure path starts with /
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return content.get(normalizedPath) || null;
}

/**
 * Get content for a category/subcategory combination
 */
export function getCategoryContent(
  category: string, 
  subcategory?: string, 
  subsubcategory?: string
): CollectionContent | null {
  const parts = [category];
  if (subcategory) parts.push(subcategory);
  if (subsubcategory) parts.push(subsubcategory);
  
  const path = '/' + parts.join('/');
  return getCollectionContent(path);
}
