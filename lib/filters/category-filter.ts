/**
 * Category Filter Utilities
 * 
 * Gets product types (subcategories) for a collection
 * and groups them by parent collection
 */

import { getProductsByCollectionAndType } from '@/lib/shopify/products-by-type';
import { normalizeProductType } from '@/lib/shopify/collection-mapping';
import { getCollectionByHandle } from '@/lib/shopify/collections';
import { shopifyFetch } from '@/lib/shopify/client';
import type { ShopifyProduct } from '@/types/shopify';

export interface SubcategoryOption {
  handle: string;
  label: string;
  value: string;
  count: number;
  productType: string;
}

/**
 * Get all unique product types (subcategories) for a collection
 */
export async function getSubcategoriesForCollection(
  collectionHandle: string
): Promise<SubcategoryOption[]> {
  try {
    const collection = await getCollectionByHandle(collectionHandle, 250);
    if (!collection) return [];

    // Get all products in collection
    const products = collection.products.edges.map(({ node }) => node);

    // Group by productType
    const productTypeMap = new Map<string, { count: number; productType: string }>();

    products.forEach((product) => {
      if (product.productType && product.productType.trim() !== '') {
        const normalized = normalizeProductType(product.productType);
        const existing = productTypeMap.get(normalized);
        
        if (existing) {
          existing.count++;
        } else {
          productTypeMap.set(normalized, {
            count: 1,
            productType: product.productType,
          });
        }
      }
    });

    return Array.from(productTypeMap.entries())
      .map(([handle, { count, productType }]) => ({
        handle,
        label: productType,
        value: handle,
        count,
        productType,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  } catch (error) {
    console.error('Error getting subcategories:', error);
    return [];
  }
}

/**
 * Get subcategories grouped by parent collection
 * This is used for the accordion filter display
 */
export async function getSubcategoriesGroupedByParent(
  parentCollectionHandle: string
): Promise<Map<string, SubcategoryOption[]>> {
  // For now, we'll get subcategories for the current collection
  // In the future, you might want to group by multiple parent collections
  const subcategories = await getSubcategoriesForCollection(parentCollectionHandle);
  
  const grouped = new Map<string, SubcategoryOption[]>();
  grouped.set(parentCollectionHandle, subcategories);
  
  return grouped;
}
