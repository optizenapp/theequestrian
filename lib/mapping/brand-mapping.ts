
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

export interface BrandMapping {
  title: string;
  handle: string; // Shopify Collection Handle
  url: string;    // Original URL from export (ignore)
  products_count: number;
  rules?: string; // JSON string with Shopify collection rules
  // Content fields matching collection-content.csv
  h1_title?: string;
  meta_title?: string;
  meta_description?: string;
  short_description?: string;
  long_description?: string;
  breadcrumb_label?: string;
  faq_json?: string;
}

let brandCache: BrandMapping[] | null = null;
let lastModifiedTime: number | null = null;

export function loadBrandMapping(): BrandMapping[] {
  const csvPath = path.join(process.cwd(), 'exports', 'brand-mapping.csv');
  
  // Check if file has been modified
  let currentModifiedTime: number | null = null;
  if (fs.existsSync(csvPath)) {
    const stats = fs.statSync(csvPath);
    currentModifiedTime = stats.mtimeMs;
  }
  
  // In development, always reload. In production, use cache only if CSV hasn't changed.
  if (process.env.NODE_ENV === 'production' && brandCache && lastModifiedTime === currentModifiedTime) {
    return brandCache;
  }

  try {
    if (!fs.existsSync(csvPath)) {
      console.warn('Brand mapping CSV not found');
      return [];
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Parse products_count if it's a JSON string
    const parsedRecords = records.map((record: any) => {
      let count = 0;
      try {
        if (typeof record.products_count === 'string' && record.products_count.startsWith('{')) {
          const parsed = JSON.parse(record.products_count);
          count = parsed.count || 0;
        } else {
          count = parseInt(record.products_count, 10) || 0;
        }
      } catch (e) {
        console.warn(`Failed to parse products_count for ${record.handle}`, e);
      }
      
      // Ensure we preserve all fields from the CSV
      return {
        ...record,
        products_count: count,
        // Ensure optional fields are undefined if empty string
        h1_title: record.h1_title || undefined,
        meta_title: record.meta_title || undefined,
        meta_description: record.meta_description || undefined,
        short_description: record.short_description || undefined,
        long_description: record.long_description || undefined,
        breadcrumb_label: record.breadcrumb_label || undefined,
        faq_json: record.faq_json || undefined
      };
    });

    brandCache = parsedRecords;
    lastModifiedTime = currentModifiedTime;
    
    // Log cache refresh in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Brand Cache] Loaded ${parsedRecords.length} brand entries from CSV`);
    }
    
    return parsedRecords;
  } catch (error) {
    console.error('Error loading brand mapping:', error);
    return [];
  }
}

export function getBrandByHandle(handle: string): BrandMapping | undefined {
  const brands = loadBrandMapping();
  return brands.find(b => b.handle === handle);
}

export function getAllBrands(): BrandMapping[] {
  return loadBrandMapping();
}
