/**
 * Collection Mapping Helper
 * 
 * Reads the mapping CSV and provides functions to:
 * 1. Get productTypes for a given collection path
 * 2. Get collection path for a given productType
 * 3. Filter products based on collection hierarchy
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

interface MappingRow {
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
  action: 'include' | 'exclude' | 'merge';
  merge_to?: string;
  notes?: string;
}

let cachedMapping: Map<string, MappingRow[]> | null = null;

/**
 * Load the mapping CSV and cache it
 */
function loadMapping(): Map<string, MappingRow[]> {
  if (cachedMapping) {
    return cachedMapping;
  }

  const mappingPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
  
  if (!fs.existsSync(mappingPath)) {
    console.warn(`Mapping file not found: ${mappingPath}`);
    return new Map();
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  // Index by collection path for fast lookup
  const mappingByPath = new Map<string, MappingRow[]>();
  
  for (const row of records) {
    // Skip excluded items
    if (row.action === 'exclude') {
      continue;
    }

    // Build the collection path
    const pathParts: string[] = [];
    if (row.top_level && row.top_level.trim()) {
      pathParts.push(row.top_level.trim());
    }
    if (row.parent_category && row.parent_category.trim()) {
      pathParts.push(row.parent_category.trim());
    }
    if (row.subcategory_handle && row.subcategory_handle.trim()) {
      pathParts.push(row.subcategory_handle.trim());
    }

    const collectionPath = pathParts.join('/');
    
    if (!collectionPath) {
      continue;
    }

    if (!mappingByPath.has(collectionPath)) {
      mappingByPath.set(collectionPath, []);
    }
    mappingByPath.get(collectionPath)!.push(row);
  }

  cachedMapping = mappingByPath;
  return mappingByPath;
}

/**
 * Get all productTypes that should appear on a given collection page
 * 
 * @param category - e.g., "horse"
 * @param subcategory - e.g., "boots" (optional)
 * @param subsubcategory - e.g., "bell-boots" (optional)
 * @returns Array of product types that should appear on this page
 */
export function getProductTypesForCollection(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): string[] {
  const mapping = loadMapping();
  
  // Build the path to look up
  const pathParts = [category];
  if (subcategory) pathParts.push(subcategory);
  if (subsubcategory) pathParts.push(subsubcategory);
  
  const collectionPath = pathParts.join('/');
  
  const rows = mapping.get(collectionPath);
  
  // If exact match found, use it
  if (rows && rows.length > 0) {
    const productTypes: string[] = [];
    for (const row of rows) {
      if (row.product_type && row.product_type.trim()) {
        productTypes.push(row.product_type.trim());
      }
    }
    return productTypes;
  }

  // For top-level categories without exact match, aggregate from all children
  if (!subcategory && !subsubcategory) {
    const productTypes = new Set<string>();
    const prefix = `${category}/`;
    
    for (const [path, pathRows] of mapping.entries()) {
      if (path.startsWith(prefix)) {
        for (const row of pathRows) {
          if (row.product_type && row.product_type.trim()) {
            productTypes.add(row.product_type.trim());
          }
        }
      }
    }
    
    return Array.from(productTypes);
  }

  return [];
}

/**
 * Get all child subcategories for a parent category
 * 
 * @param category - e.g., "horse"
 * @param subcategory - e.g., "boots" (optional)
 * @returns Array of unique subcategory handles
 */
export function getSubcategoriesForCollection(
  category: string,
  subcategory?: string
): Array<{ handle: string; label: string; count: number }> {
  const mapping = loadMapping();
  
  const prefix = subcategory ? `${category}/${subcategory}/` : `${category}/`;
  const subcategories = new Map<string, { label: string; count: number }>();

  for (const [path, rows] of mapping.entries()) {
    if (path.startsWith(prefix)) {
      // Extract the next level
      const remainder = path.substring(prefix.length);
      const nextLevel = remainder.split('/')[0];
      
      if (nextLevel && nextLevel.trim()) {
        const existing = subcategories.get(nextLevel);
        if (existing) {
          existing.count += rows.length;
        } else {
          // Use the first row's product_type as label
          const label = rows[0]?.product_type || nextLevel;
          subcategories.set(nextLevel, { label, count: rows.length });
        }
      }
    }
  }

  return Array.from(subcategories.entries()).map(([handle, { label, count }]) => ({
    handle,
    label,
    count,
  }));
}

/**
 * Filter products by productType for a given collection
 */
export function filterProductsByCollection<T extends { productType?: string | null }>(
  products: T[],
  category: string,
  subcategory?: string,
  subsubcategory?: string
): T[] {
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, subsubcategory);
  
  console.log(`[filterProductsByCollection] ${category}/${subcategory || ''}/${subsubcategory || ''}`);
  console.log(`  Allowed types (${allowedProductTypes.length}):`, allowedProductTypes.slice(0, 10));
  console.log(`  Total products:`, products.length);
  console.log(`  Sample product types:`, products.slice(0, 10).map(p => p.productType));
  
  if (allowedProductTypes.length === 0) {
    console.log(`  No mapping found - returning all products`);
    // If no mapping found, show all products (fallback behavior)
    return products;
  }

  // Create a Set for faster lookup (case-insensitive, trimmed)
  const allowedSet = new Set(
    allowedProductTypes.map(pt => pt.toLowerCase().trim())
  );

  const filtered = products.filter((product) => {
    if (!product.productType) {
      return false;
    }
    const normalizedType = product.productType.toLowerCase().trim();
    return allowedSet.has(normalizedType);
  });
  
  console.log(`  Filtered products:`, filtered.length);
  
  return filtered;
}

/**
 * Get the collection hierarchy for breadcrumbs
 */
export function getCollectionHierarchy(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Array<{ label: string; href: string }> {
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  // Add category
  breadcrumbs.push({
    label: category.charAt(0).toUpperCase() + category.slice(1),
    href: `/${category}`,
  });

  // Add subcategory
  if (subcategory) {
    breadcrumbs.push({
      label: subcategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      href: `/${category}/${subcategory}`,
    });
  }

  // Add sub-subcategory
  if (subsubcategory) {
    breadcrumbs.push({
      label: subsubcategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      href: `/${category}/${subcategory}/${subsubcategory}`,
    });
  }

  return breadcrumbs;
}

/**
 * Get collection title from the mapping
 */
export function getCollectionTitle(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): string {
  const mapping = loadMapping();
  
  const pathParts = [category];
  if (subcategory) pathParts.push(subcategory);
  if (subsubcategory) pathParts.push(subsubcategory);
  
  const collectionPath = pathParts.join('/');
  const rows = mapping.get(collectionPath);
  
  if (rows && rows.length > 0 && rows[0].product_type) {
    // Use the first product type as the title
    return rows[0].product_type;
  }

  // Fallback: generate from path
  const lastPart = subsubcategory || subcategory || category;
  return lastPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

