/**
 * Dynamic Product Count Utilities
 * 
 * Provides real-time product counts for categories without requiring database caching.
 * Uses Shopify's search API with count-only queries for performance.
 */

import { shopifyFetch } from '@/lib/shopify/client';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';

interface ProductCountResult {
  count: number;
  hasProducts: boolean;
}

/**
 * Get product count for a category path using Shopify's search API
 * This is a lightweight query that only fetches the count, not actual products
 */
export async function getProductCountForCategory(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Promise<ProductCountResult> {
  try {
    // Get the product types for this category
    const productTypes = await getProductTypesForCollection(category, subcategory, subsubcategory);
    
    if (productTypes.length === 0) {
      return { count: 0, hasProducts: false };
    }

    // Build a lightweight query that only fetches the count
    const queryConditions = productTypes.map(type => `product_type:"${type}"`).join(' OR ');
    
    const query = `
      query getProductCount($query: String!) {
        products(first: 1, query: $query) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const variables = {
      query: queryConditions
    };

    const data = await shopifyFetch<{
      products: {
        edges: Array<{ node: { id: string } }>;
        pageInfo: { hasNextPage: boolean };
      };
    }>({
      query,
      variables,
      cache: 'force-cache',
    });

    const hasProducts = data.products.edges.length > 0;
    
    // For performance, we return a simple boolean check rather than exact count
    // If you need exact counts, you'd need to fetch all pages or use a different approach
    return {
      count: hasProducts ? 1 : 0, // Simplified: 1 means "has products", 0 means "empty"
      hasProducts
    };
  } catch (error) {
    console.error(`[getProductCountForCategory] Error for ${category}/${subcategory}/${subsubcategory}:`, error);
    return { count: 0, hasProducts: false };
  }
}

/**
 * Get product counts for multiple subcategories in parallel
 * Used for filtering navigation pills
 */
export async function getProductCountsForSubcategories(
  subcategories: Array<{ handle: string; label: string }>,
  category: string,
  subcategory?: string
): Promise<Map<string, ProductCountResult>> {
  const counts = new Map<string, ProductCountResult>();
  
  // Fetch all counts in parallel for performance
  const promises = subcategories.map(async (sub) => {
    const count = await getProductCountForCategory(
      category,
      subcategory || sub.handle,
      subcategory ? sub.handle : undefined
    );
    return { handle: sub.handle, count };
  });

  const results = await Promise.all(promises);
  
  results.forEach(({ handle, count }) => {
    counts.set(handle, count);
  });

  return counts;
}

/**
 * Filter subcategories to only include those with products
 * Used by CategoryPills and navigation components
 */
export async function filterSubcategoriesWithProducts(
  subcategories: Array<{ handle: string; label: string }>,
  category: string,
  subcategory?: string
): Promise<Array<{ handle: string; label: string; count: number }>> {
  const counts = await getProductCountsForSubcategories(subcategories, category, subcategory);
  
  return subcategories
    .map(sub => ({
      ...sub,
      count: counts.get(sub.handle)?.count || 0
    }))
    .filter(sub => sub.count > 0); // Only include categories with products
}
