/**
 * Utilities for automatically determining primary collection paths
 * for products based on their productType and collections
 */

import type { ShopifyProduct } from '@/types/shopify';
import { 
  getCollectionForProductType, 
  normalizeProductType,
  DEFAULT_COLLECTION 
} from './collection-mapping';

/**
 * Determine primary collection path from product data
 * 
 * Priority:
 * 1. Use productType to determine core collection
 * 2. Use normalized productType as subcategory
 * 3. Fallback to tags if no productType
 * 4. Fallback to first collection if no productType or tags
 * 
 * Format: collection-handle/product-type or collection-handle
 */
export function determinePrimaryCollection(product: ShopifyProduct): string | null {
  // Priority 1: Use productType
  if (product.productType && product.productType.trim() !== '') {
    const collectionHandle = getCollectionForProductType(product.productType);
    const subcategoryHandle = normalizeProductType(product.productType);
    
    // Avoid redundant paths like "horse-rugs/horse-rugs"
    if (collectionHandle === subcategoryHandle) {
      return collectionHandle;
    }
    
    return `${collectionHandle}/${subcategoryHandle}`;
  }

  // Priority 2: Use tags as fallback
  if (product.tags && product.tags.length > 0) {
    // Filter out non-subcategory tags
    const subcategoryTag = product.tags.find(tag => 
      !tag.startsWith('_') && 
      tag.length > 2 &&
      !tag.toLowerCase().includes('sale') &&
      !tag.toLowerCase().includes('new')
    );
    
    if (subcategoryTag) {
      const normalized = normalizeProductType(subcategoryTag);
      const collectionHandle = getCollectionForProductType(subcategoryTag);
      
      if (collectionHandle === normalized) {
        return collectionHandle;
      }
      
      return `${collectionHandle}/${normalized}`;
    }
  }

  // Priority 3: Use first collection if available
  if (product.collections && product.collections.edges.length > 0) {
    return product.collections.edges[0].node.handle;
  }

  // No suitable collection found
  return null;
}

/**
 * Check if a subcategory path is valid
 */
export function isValidSubcategoryPath(
  collectionHandle: string,
  subcategoryHandle: string,
  products: ShopifyProduct[]
): boolean {
  return products.some(product => {
    if (!product.productType) return false;
    const normalized = normalizeProductType(product.productType);
    return normalized === subcategoryHandle;
  });
}

/**
 * Determine primary collection with priority rules
 * 
 * This version includes metafield checking for pre-set primary collections
 */
export function determinePrimaryCollectionWithPriority(
  product: ShopifyProduct
): string | null {
  // Check if primary_collection metafield is already set
  if (product.metafield?.value) {
    return product.metafield.value;
  }

  // Otherwise, determine automatically
  return determinePrimaryCollection(product);
}

/**
 * Batch process products to determine their primary collections
 */
export function determinePrimaryCollectionsForProducts(
  products: ShopifyProduct[]
): Map<string, string> {
  const primaryCollections = new Map<string, string>();

  products.forEach(product => {
    const primaryCollection = determinePrimaryCollection(product);
    if (primaryCollection) {
      primaryCollections.set(product.id, primaryCollection);
    }
  });

  return primaryCollections;
}
