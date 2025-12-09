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
import { getCategoryContent } from '@/lib/content/collections';

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
          // Use getCollectionTitle to get the proper H1 from collection-content.csv
          const label = subcategory 
            ? getCollectionTitle(category, subcategory, nextLevel)
            : getCollectionTitle(category, nextLevel);
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
 * Get the collection hierarchy for breadcrumbs with proper labels from mapping
 */
export function getCollectionHierarchy(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Array<{ label: string; href: string }> {
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  // Add category with proper label
  breadcrumbs.push({
    label: getCollectionTitle(category),
    href: `/${category}`,
  });

  // Add subcategory with proper label
  if (subcategory) {
    breadcrumbs.push({
      label: getCollectionTitle(category, subcategory),
      href: `/${category}/${subcategory}`,
    });
  }

  // Add sub-subcategory with proper label
  if (subsubcategory) {
    breadcrumbs.push({
      label: getCollectionTitle(category, subcategory, subsubcategory),
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
  // 1. Try Content CSV first (Master Source for labels)
  try {
    const content = getCategoryContent(category, subcategory, subsubcategory);
    if (content) {
      // Prefer breadcrumb label, then h1_title
      if (content.breadcrumb_label) return content.breadcrumb_label;
      if (content.h1_title) return content.h1_title;
    }
  } catch (e) {
    // Ignore errors and fall back to mapping
    console.warn('Error fetching content for title:', e);
  }

  // 2. Fallback to Mapping CSV
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

/**
 * Get all breadcrumb paths for a product based on its product type
 * Returns all collection paths where this product type appears
 * 
 * @param productType - The Shopify product type
 * @returns Array of breadcrumb paths (primary first, then additional paths)
 */
export function getBreadcrumbsForProduct(
  productType: string
): Array<Array<{ label: string; href: string }>> {
  if (!productType || !productType.trim()) {
    return [];
  }

  const mapping = loadMapping();
  const normalizedProductType = productType.toLowerCase().trim();
  const breadcrumbPaths: Array<Array<{ label: string; href: string }>> = [];

  // Find all collection paths that include this product type
  for (const [collectionPath, rows] of mapping.entries()) {
    for (const row of rows) {
      if (row.product_type && row.product_type.toLowerCase().trim() === normalizedProductType) {
        // Build breadcrumb path for this collection
        const pathParts = collectionPath.split('/');
        const breadcrumbs: Array<{ label: string; href: string }> = [];

        // Build breadcrumb for each level
        for (let i = 0; i < pathParts.length; i++) {
          const partialPath = pathParts.slice(0, i + 1);
          const href = `/${partialPath.join('/')}`;
          const label = getCollectionTitle(...partialPath as [string, string?, string?]);
          
          breadcrumbs.push({ label, href });
        }

        breadcrumbPaths.push(breadcrumbs);
        break; // Only add this path once
      }
    }
  }

  // Sort by path length (most specific first, which becomes primary)
  breadcrumbPaths.sort((a, b) => b.length - a.length);

  return breadcrumbPaths;
}

/**
 * Helper function to format URL slug to display name
 * Fallback for when mapping doesn't have a proper name
 */
export function formatSlugToLabel(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

