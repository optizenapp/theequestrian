
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

export interface SalePageMapping {
  handle: string; // Shopify Collection Handle
  url_path: string;
  h1_title?: string;
  meta_title?: string;
  meta_description?: string;
  short_description?: string;
  long_description?: string;
  breadcrumb_label?: string;
  faq_json?: string;
}

let saleCache: SalePageMapping[] | null = null;

export function loadSaleMapping(): SalePageMapping[] {
  if (saleCache) return saleCache;

  try {
    const csvPath = path.join(process.cwd(), 'exports', 'sale-pages.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn('Sale pages CSV not found');
      return [];
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    const parsedRecords = records.map((record: any) => ({
      ...record,
      h1_title: record.h1_title || undefined,
      meta_title: record.meta_title || undefined,
      meta_description: record.meta_description || undefined,
      short_description: record.short_description || undefined,
      long_description: record.long_description || undefined,
      breadcrumb_label: record.breadcrumb_label || undefined,
      faq_json: record.faq_json || undefined
    }));

    saleCache = parsedRecords;
    return parsedRecords;
  } catch (error) {
    console.error('Error loading sale mapping:', error);
    return [];
  }
}

export function getSalePageByPath(pathName: string): SalePageMapping | undefined {
  const pages = loadSaleMapping();
  // Ensure path starts with /
  const normalizedPath = pathName.startsWith('/') ? pathName : `/${pathName}`;
  return pages.find(p => p.url_path === normalizedPath);
}

export function getSalePageByHandle(handle: string): SalePageMapping | undefined {
  const pages = loadSaleMapping();
  return pages.find(p => p.handle === handle);
}

