/**
 * Database Query Helpers
 * Fast product queries using Neon Database
 */

import { sql } from './client';

export interface ProductFilters {
  brands?: string[];
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  search?: string;
}

export interface ProductQueryResult {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  product_type: string;
  tags: string[];
  image_url: string;
  image_alt: string;
  available_for_sale: boolean;
  shopify_created_at: string;
}

export interface FacetResult {
  brands: Array<{ value: string; count: number }>;
  sizes: Array<{ value: string; count: number }>;
  colors: Array<{ value: string; count: number }>;
}

/**
 * Search products with filters and pagination
 */
export async function searchProducts(
  productTypes: string[],
  filters: ProductFilters = {},
  limit: number = 36,
  offset: number = 0
): Promise<{
  products: ProductQueryResult[];
  totalCount: number;
  hasNextPage: boolean;
}> {
  try {
    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Product types filter
    if (productTypes.length > 0) {
      conditions.push(`product_type = ANY($${paramIndex})`);
      params.push(productTypes);
      paramIndex++;
    }
    
    // Brand filter
    if (filters.brands && filters.brands.length > 0) {
      // Check both vendor field and tags (some brands use tags)
      const brandConditions = filters.brands.map(brand => {
        const lowerBrand = brand.toLowerCase();
        return `(LOWER(vendor) = '${lowerBrand}' OR '${lowerBrand}' = ANY(tags))`;
      }).join(' OR ');
      conditions.push(`(${brandConditions})`);
    }
    
    // Size filter
    if (filters.sizes && filters.sizes.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(filters.sizes);
      paramIndex++;
    }
    
    // Color filter
    if (filters.colors && filters.colors.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(filters.colors);
      paramIndex++;
    }
    
    // In stock only
    if (filters.inStockOnly) {
      conditions.push('available_for_sale = true');
    }
    
    // Full-text search (optional)
    if (filters.search) {
      conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(filters.search);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products
      ${whereClause}
    `;
    const countResult = await sql(countQuery, params);
    const totalCount = parseInt(countResult[0].total);
    
    // Get products with pagination
    const productsQuery = `
      SELECT 
        id,
        handle,
        title,
        description,
        vendor,
        product_type,
        tags,
        image_url,
        image_alt,
        available_for_sale,
        shopify_created_at
      FROM products
      ${whereClause}
      ORDER BY shopify_created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const productsResult = await sql(productsQuery, [...params, limit, offset]);
    
    return {
      products: productsResult as ProductQueryResult[],
      totalCount,
      hasNextPage: offset + limit < totalCount,
    };
  } catch (error) {
    console.error('[searchProducts] Error:', error);
    throw error;
  }
}

/**
 * Calculate facets for a given set of filters
 */
export async function calculateFacets(
  productTypes: string[],
  filters: ProductFilters = {}
): Promise<FacetResult> {
  try {
    // Build WHERE clause (same as searchProducts)
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (productTypes.length > 0) {
      conditions.push(`product_type = ANY($${paramIndex})`);
      params.push(productTypes);
      paramIndex++;
    }
    
    if (filters.brands && filters.brands.length > 0) {
      const brandConditions = filters.brands.map(brand => {
        const lowerBrand = brand.toLowerCase();
        return `(LOWER(vendor) = '${lowerBrand}' OR '${lowerBrand}' = ANY(tags))`;
      }).join(' OR ');
      conditions.push(`(${brandConditions})`);
    }
    
    if (filters.sizes && filters.sizes.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(filters.sizes);
      paramIndex++;
    }
    
    if (filters.colors && filters.colors.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(filters.colors);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get brand facets
    const brandQuery = `
      SELECT 
        LOWER(vendor) as value,
        COUNT(DISTINCT id) as count
      FROM products
      ${whereClause}
      GROUP BY LOWER(vendor)
      HAVING LOWER(vendor) IS NOT NULL AND LOWER(vendor) != ''
      ORDER BY count DESC
    `;
    const brandResult = await sql(brandQuery, params);
    
    // Get size facets (from tags)
    // This is a simplified version - you may want to filter tags that look like sizes
    const sizeQuery = `
      SELECT 
        UNNEST(tags) as value,
        COUNT(*) as count
      FROM products
      ${whereClause}
      GROUP BY value
      ORDER BY count DESC
      LIMIT 50
    `;
    const sizeResult = await sql(sizeQuery, params);
    
    // Get color facets (from tags)
    const colorQuery = `
      SELECT 
        UNNEST(tags) as value,
        COUNT(*) as count
      FROM products
      ${whereClause}
      GROUP BY value
      ORDER BY count DESC
      LIMIT 50
    `;
    const colorResult = await sql(colorQuery, params);
    
    return {
      brands: brandResult.map(row => ({
        value: row.value,
        count: parseInt(row.count),
      })),
      sizes: sizeResult.map(row => ({
        value: row.value,
        count: parseInt(row.count),
      })),
      colors: colorResult.map(row => ({
        value: row.value,
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    console.error('[calculateFacets] Error:', error);
    throw error;
  }
}

/**
 * Get a single product by handle
 */
export async function getProductByHandle(handle: string): Promise<ProductQueryResult | null> {
  try {
    const result = await sql`
      SELECT 
        id,
        handle,
        title,
        description,
        vendor,
        product_type,
        tags,
        image_url,
        image_alt,
        available_for_sale,
        shopify_created_at
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `;
    
    return result[0] as ProductQueryResult || null;
  } catch (error) {
    console.error('[getProductByHandle] Error:', error);
    return null;
  }
}

/**
 * Get products by IDs (for batch operations)
 */
export async function getProductsByIds(ids: string[]): Promise<ProductQueryResult[]> {
  try {
    const result = await sql`
      SELECT 
        id,
        handle,
        title,
        description,
        vendor,
        product_type,
        tags,
        image_url,
        image_alt,
        available_for_sale,
        shopify_created_at
      FROM products
      WHERE id = ANY(${ids})
    `;
    
    return result as ProductQueryResult[];
  } catch (error) {
    console.error('[getProductsByIds] Error:', error);
    return [];
  }
}
