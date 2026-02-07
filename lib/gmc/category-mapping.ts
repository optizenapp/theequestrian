import fs from 'fs';
import path from 'path';
import * as csv from 'csv-parse/sync';

type CategoryRow = {
  product_type: string;
  google_product_category: string;
};

let cachedMapping: Map<string, string> | null = null;
let lastLoaded = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

function loadCategoryMapping(): Map<string, string> {
  if (cachedMapping && Date.now() - lastLoaded < CACHE_TTL_MS) {
    return cachedMapping;
  }

  const mappingPath = path.join(process.cwd(), 'config', 'gmc-product-category-mapping.csv');
  if (!fs.existsSync(mappingPath)) {
    cachedMapping = new Map();
    lastLoaded = Date.now();
    return cachedMapping;
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CategoryRow[];

  const map = new Map<string, string>();
  records.forEach((row) => {
    if (!row.product_type || !row.google_product_category) return;
    map.set(row.product_type.trim().toLowerCase(), row.google_product_category.trim());
  });

  cachedMapping = map;
  lastLoaded = Date.now();
  return map;
}

function inferTopLevelCategory(canonicalPath?: string | null): string | null {
  if (!canonicalPath) return null;
  const trimmed = canonicalPath.replace(/^\//, '');
  const topLevel = trimmed.split('/')[0];
  return topLevel || null;
}

function getFallbackCategory(topLevel: string | null): string | null {
  if (!topLevel) return null;
  switch (topLevel.toLowerCase()) {
    case 'horse':
      return '1031'; // Sporting Goods > Outdoor Recreation > Equestrian
    case 'rider':
      return '1604'; // Apparel & Accessories > Clothing
    case 'stable':
      return '1031'; // Sporting Goods > Outdoor Recreation > Equestrian
    case 'dog':
      return '5'; // Animals & Pet Supplies > Pet Supplies > Dog Supplies
    case 'cat':
      return '4'; // Animals & Pet Supplies > Pet Supplies > Cat Supplies
    case 'bird':
      return '3'; // Animals & Pet Supplies > Pet Supplies > Bird Supplies
    case 'pet':
      return '2'; // Animals & Pet Supplies > Pet Supplies
    default:
      return null;
  }
}

export function getGoogleProductCategory(productType: string | null, canonicalPath?: string | null): string | null {
  if (productType && productType.trim()) {
    const mapping = loadCategoryMapping();
    const mapped = mapping.get(productType.trim().toLowerCase());
    if (mapped) {
      return mapped;
    }
  }

  const topLevel = inferTopLevelCategory(canonicalPath);
  return getFallbackCategory(topLevel);
}
