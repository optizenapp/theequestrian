/**
 * Collection Mapping Helper
 * 
 * Reads the mapping from Postgres (with CSV fallback) and provides functions to:
 * 1. Get productTypes for a given collection path
 * 2. Get collection path for a given productType
 * 3. Filter products based on collection hierarchy
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { getCategoryContent } from '@/lib/content/collections';
import { sql } from '@/lib/db/client';

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
let lastCacheTime: number = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Load the mapping from CSV (fallback only)
 * Used when database is unavailable
 */
function loadMappingFromCSV(): Map<string, MappingRow[]> {
  const mappingPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
  
  if (!fs.existsSync(mappingPath)) {
    console.warn(`[loadMappingFromCSV] Mapping file not found: ${mappingPath}`);
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

  return mappingByPath;
}

/**
 * Load the mapping from Postgres and cache it
 * Falls back to CSV if database is unavailable
 * In-memory cache with 15-minute TTL
 */
async function loadMapping(): Promise<Map<string, MappingRow[]>> {
  // Check in-memory cache first (with TTL)
  if (cachedMapping && Date.now() - lastCacheTime < CACHE_TTL_MS) {
    return cachedMapping;
  }

  try {
    // Query database
    const rows = await sql`
      SELECT 
        top_level,
        parent_category,
        subcategory_handle,
        product_type,
        action,
        merge_to,
        notes
      FROM collection_mapping
      WHERE action != 'exclude'
      ORDER BY top_level, parent_category, subcategory_handle
    `;

    // Build Map structure (same as CSV version)
    const mappingByPath = new Map<string, MappingRow[]>();
    
    for (const row of rows) {
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
      mappingByPath.get(collectionPath)!.push(row as MappingRow);
    }

    cachedMapping = mappingByPath;
    lastCacheTime = Date.now();
    
    console.log(`[loadMapping] Loaded ${rows.length} mapping rows from Postgres`);
    return mappingByPath;
    
  } catch (error) {
    console.error('[loadMapping] Database error, falling back to CSV:', error);
    
    // If we have stale cache, use it
    if (cachedMapping) {
      console.log('[loadMapping] Using stale cache');
      return cachedMapping;
    }
    
    // Otherwise fall back to CSV
    console.log('[loadMapping] Loading from CSV fallback');
    const csvMapping = loadMappingFromCSV();
    cachedMapping = csvMapping;
    lastCacheTime = Date.now();
    return csvMapping;
  }
}

/**
 * Build merge map for resolving product type aliases
 * Maps product types with 'merge' action to their target product type
 * 
 * Example: "RIDER: Helmets" -> "Helmets", "Helmet" -> "Helmets"
 */
async function buildMergeMap(): Promise<Map<string, string>> {
  const mapping = await loadMapping();
  const mergeMap = new Map<string, string>();
  
  for (const [_, rows] of mapping.entries()) {
    for (const row of rows) {
      if (row.action === 'merge' && row.merge_to && row.product_type) {
        const sourceType = row.product_type.trim();
        const targetType = row.merge_to.trim();
        mergeMap.set(sourceType, targetType);
      }
    }
  }
  
  return mergeMap;
}

/**
 * Resolve a product type through merge actions
 * If the product type has a merge action, return the merge target
 * Otherwise return the original product type
 */
function resolveProductType(productType: string, mergeMap: Map<string, string>): string {
  const trimmed = productType.trim();
  return mergeMap.get(trimmed) || trimmed;
}

/**
 * Get all productTypes that should appear on a given collection page
 * Handles merge actions: includes BOTH the original product types AND their merge targets
 * This ensures products are found regardless of which product_type value they have in Shopify
 * 
 * Example: If "RIDER: Helmets" merges to "Helmets", the query will include BOTH types
 * 
 * @param category - e.g., "horse"
 * @param subcategory - e.g., "boots" (optional)
 * @param subsubcategory - e.g., "bell-boots" (optional)
 * @returns Array of product types to query (includes both original and merged types)
 */
export async function getProductTypesForCollection(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Promise<string[]> {
  const mapping = await loadMapping();
  const mergeMap = await buildMergeMap();
  
  // Build the path to look up
  const pathParts = [category];
  if (subcategory) pathParts.push(subcategory);
  if (subsubcategory) pathParts.push(subsubcategory);
  
  const collectionPath = pathParts.join('/');
  
  const rows = mapping.get(collectionPath);
  
  // If exact match found, and it's a leaf node (has no children), use it
  // But if it might have children (like pet/dog), we want to fall through to aggregation
  if (rows && rows.length > 0 && subsubcategory) {
    const productTypes = new Set<string>();
    for (const row of rows) {
      if (row.product_type && row.product_type.trim()) {
        const originalType = row.product_type.trim();
        
        // Always include the original product type (for products that have this exact type in Shopify)
        productTypes.add(originalType);
        
        // If this is a merge action, also include the target type
        if (row.action === 'merge' && row.merge_to) {
          productTypes.add(row.merge_to.trim());
        }
      }
    }
    return Array.from(productTypes);
  }

  // For top-level categories or categories with subcategories, aggregate from all children
  if (!subsubcategory) {
    const productTypes = new Set<string>();
    
    // Add exact matches for the current path first
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (row.product_type && row.product_type.trim()) {
          const originalType = row.product_type.trim();
          
          // Always include the original product type
          productTypes.add(originalType);
          
          // If this is a merge action, also include the target type
          if (row.action === 'merge' && row.merge_to) {
            productTypes.add(row.merge_to.trim());
          }
        }
      }
    }

    // Then find all descendants
    const prefix = subcategory ? `${category}/${subcategory}/` : `${category}/`;
    
    for (const [path, pathRows] of mapping.entries()) {
      if (path.startsWith(prefix)) {
        for (const row of pathRows) {
          if (row.product_type && row.product_type.trim()) {
            const originalType = row.product_type.trim();
            
            // Always include the original product type
            productTypes.add(originalType);
            
            // If this is a merge action, also include the target type
            if (row.action === 'merge' && row.merge_to) {
              productTypes.add(row.merge_to.trim());
            }
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
export async function getSubcategoriesForCollection(
  category: string,
  subcategory?: string
): Promise<Array<{ handle: string; label: string; count: number }>> {
  const mapping = await loadMapping();
  
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
          // Prefer content-driven labels so pills match page names
          const content = subcategory
            ? await getCategoryContent(category, subcategory, nextLevel)
            : await getCategoryContent(category, nextLevel);
          const label = content?.breadcrumb_label || content?.h1_title || (
            subcategory
              ? getCollectionTitle(category, subcategory, nextLevel)
              : getCollectionTitle(category, nextLevel)
          );
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
export async function filterProductsByCollection<T extends { productType?: string | null }>(
  products: T[],
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Promise<T[]> {
  const allowedProductTypes = await getProductTypesForCollection(category, subcategory, subsubcategory);
  
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
 * Note: This function remains synchronous and uses cached mapping
 * For database content (h1_title, breadcrumb_label), use getCategoryContent() directly
 */
export function getCollectionTitle(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): string {
  // Use cached mapping (if available) or fallback to CSV
  let mapping: Map<string, MappingRow[]>;
  
  if (cachedMapping) {
    mapping = cachedMapping;
  } else {
    // Synchronous fallback to CSV for this function
    mapping = loadMappingFromCSV();
  }
  
  const pathParts = [category];
  if (subcategory) pathParts.push(subcategory);
  if (subsubcategory) pathParts.push(subsubcategory);
  
  const collectionPath = pathParts.join('/');
  const rows = mapping.get(collectionPath);
  
  if (rows && rows.length > 0) {
    const lastPart = subsubcategory || subcategory || category;
    const normalizedHandle = lastPart
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Prefer rows that explicitly map to this handle (merge_to) or match the handle when normalized
    const preferredRow = rows.find((row) => {
      if (row.merge_to && row.merge_to.trim()) {
        return row.merge_to.trim().toLowerCase() === normalizedHandle;
      }
      if (row.product_type && row.product_type.trim()) {
        const normalizedType = row.product_type
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return normalizedType === normalizedHandle;
      }
      return false;
    });

    const titleSource = preferredRow?.product_type || rows[0].product_type;
    if (titleSource) {
      return titleSource;
    }
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
export async function getBreadcrumbsForProduct(
  productType: string
): Promise<Array<Array<{ label: string; href: string }>>> {
  if (!productType || !productType.trim()) {
    return [];
  }

  const mapping = await loadMapping();
  const normalizedProductType = productType.toLowerCase().trim();
  const breadcrumbPaths: Array<Array<{ label: string; href: string }>> = [];

  // Find all collection paths that include this product type
  for (const [collectionPath, rows] of mapping.entries()) {
    for (const row of rows) {
      const rowProductType = row.product_type?.toLowerCase().trim();
      
      // Match if the product_type matches (regardless of action)
      if (rowProductType === normalizedProductType) {
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

