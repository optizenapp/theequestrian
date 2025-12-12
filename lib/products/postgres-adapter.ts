/**
 * Postgres Product Adapter
 * Converts database products to Shopify format for compatibility
 */

import { searchProducts, type ProductFilters, type ProductQueryResult } from '@/lib/db/queries';
import type { ProductWithPrimaryCollection } from '@/types/shopify';

/**
 * Convert database product to Shopify format
 * Note: Prices are set to 0 - will be hydrated client-side
 */
export function dbProductToShopifyFormat(dbProduct: ProductQueryResult): ProductWithPrimaryCollection {
  return {
    id: dbProduct.id,
    handle: dbProduct.handle,
    title: dbProduct.title,
    description: dbProduct.description,
    descriptionHtml: dbProduct.description,
    vendor: dbProduct.vendor,
    productType: dbProduct.product_type,
    tags: dbProduct.tags,
    availableForSale: dbProduct.available_for_sale,
    createdAt: dbProduct.shopify_created_at,
    
    // Images
    images: {
      edges: dbProduct.image_url ? [{
        node: {
          url: dbProduct.image_url,
          altText: dbProduct.image_alt || dbProduct.title,
          width: 800,
          height: 800,
        }
      }] : []
    },
    
    // Price range (placeholder - will be hydrated client-side)
    priceRange: {
      minVariantPrice: {
        amount: '0',
        currencyCode: 'AUD'
      },
      maxVariantPrice: {
        amount: '0',
        currencyCode: 'AUD'
      }
    },
    
    // Compare at price (placeholder)
    compareAtPriceRange: {
      minVariantPrice: {
        amount: '0',
        currencyCode: 'AUD'
      },
      maxVariantPrice: {
        amount: '0',
        currencyCode: 'AUD'
      }
    },
    
    // Variants (placeholder - will be hydrated client-side)
    variants: {
      edges: []
    },
    
    // Collections (not stored in DB)
    collections: {
      edges: []
    },
    
    // Metafield (not used with Postgres)
    metafield: null,
  } as ProductWithPrimaryCollection;
}

/**
 * Get products by types using Postgres (replaces Shopify query)
 */
export async function getProductsByTypesFromDB(
  productTypes: string[],
  limit: number = 36,
  after: string | null = null,
  filters?: {
    brands?: string[];
    sizes?: string[];
    colors?: string[];
  }
): Promise<{
  products: ProductWithPrimaryCollection[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount: number;
  facets: {
    brands: { value: string; count: number; displayName: string }[];
    sizes: { value: string; count: number }[];
    colors: { value: string; count: number; originalValue: string }[];
    price: { min: number; max: number };
  };
}> {
  // Parse pagination cursor
  let offset = 0;
  if (after) {
    const match = after.match(/^page:(\d+)$/);
    if (match) {
      offset = parseInt(match[1]) * limit;
    }
  }
  
  // Build filters for database query
  const dbFilters: ProductFilters = {};
  if (filters?.brands) {
    dbFilters.brands = filters.brands;
  }
  if (filters?.sizes) {
    dbFilters.sizes = filters.sizes;
  }
  if (filters?.colors) {
    dbFilters.colors = filters.colors;
  }
  
  // Query database
  const { products: dbProducts, totalCount, hasNextPage } = await searchProducts(
    productTypes,
    dbFilters,
    limit,
    offset
  );
  
  // Convert to Shopify format
  const products = dbProducts.map(dbProductToShopifyFormat);
  
  // Calculate next cursor
  const nextPage = Math.floor(offset / limit) + 1;
  const endCursor = hasNextPage ? `page:${nextPage}` : null;
  
  // Build facets (simplified for now - can be enhanced)
  // In a real implementation, you'd query the database for facets
  const facets = {
    brands: [] as { value: string; count: number; displayName: string }[],
    sizes: [] as { value: string; count: number }[],
    colors: [] as { value: string; count: number; originalValue: string }[],
    price: { min: 0, max: 1000 }
  };
  
  return {
    products,
    pageInfo: {
      hasNextPage,
      endCursor
    },
    totalCount,
    facets
  };
}
