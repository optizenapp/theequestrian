import { shopifyFetch } from './client';
import { GET_PRODUCT_BY_HANDLE, GET_ALL_PRODUCTS, GET_PRODUCTS_BY_QUERY } from './queries';
import type { ShopifyProduct, ProductWithPrimaryCollection } from '@/types/shopify';

interface ProductResponse {
  product: ShopifyProduct;
}

interface ProductsResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      endCursor: string | null;
    };
  };
}

// Simple in-memory cache for all products
let productsCache: {
  data: ProductWithPrimaryCollection[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get a product by its handle
 */
export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  try {
    const data = await shopifyFetch<ProductResponse>({
      query: GET_PRODUCT_BY_HANDLE,
      variables: { handle },
    });

    return data.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Get all products (with pagination support and caching)
 */
export async function getAllProducts(): Promise<ProductWithPrimaryCollection[]> {
  // Check cache first
  const now = Date.now();
  if (productsCache && (now - productsCache.timestamp) < CACHE_TTL) {
    console.log(`[getAllProducts] Returning ${productsCache.data.length} cached products`);
    return productsCache.data;
  }

  try {
    console.log('[getAllProducts] Fetching all products from Shopify...');
    const allProducts: ProductWithPrimaryCollection[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;

    while (hasNextPage) {
      const data: ProductsResponse = await shopifyFetch<ProductsResponse>({
        query: GET_ALL_PRODUCTS,
        variables: { first: 250, after: cursor },
      });

      allProducts.push(...data.products.edges.map(({ node }) => node as ProductWithPrimaryCollection));
      
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor || null;
      pageCount++;
      
      if (pageCount % 10 === 0) {
        console.log(`[getAllProducts] Fetched ${allProducts.length} products so far...`);
      }
    }

    console.log(`[getAllProducts] ✅ Fetched ${allProducts.length} total products`);
    
    // Cache the results
    productsCache = {
      data: allProducts,
      timestamp: now,
    };
    
    return allProducts;
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}

/**
 * Get products by product types (optimized for collection pages)
 * Uses Shopify's query parameter to filter on the server side
 */
export async function getProductsByTypes(
  productTypes: string[], 
  limit: number = 36, 
  after: string | null = null
): Promise<{ products: ProductWithPrimaryCollection[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }> {
  if (productTypes.length === 0) {
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  try {
    console.log(`[getProductsByTypes] Fetching ${limit} products for types:`, productTypes.slice(0, 5));
    
    // Build Shopify search query: "product_type:Type1 OR product_type:Type2"
    const queryString = productTypes
      .map(type => `product_type:"${type.replace(/"/g, '\\"')}"`)
      .join(' OR ');

    const data = await shopifyFetch<ProductsResponse>({
      query: GET_PRODUCTS_BY_QUERY,
      variables: { 
        query: queryString,
        first: limit,
        after: after 
      },
      cache: 'force-cache',
    });

    const products = data.products.edges.map(({ node }) => node as ProductWithPrimaryCollection);
    const pageInfo = {
      hasNextPage: data.products.pageInfo.hasNextPage,
      endCursor: data.products.pageInfo.endCursor
    };

    console.log(`[getProductsByTypes] ✅ Found ${products.length} products`);
    return { products, pageInfo };
  } catch (error) {
    console.error('Error fetching products by types:', error);
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
}

/**
 * Get recommended products (limit to specified number)
 */
export async function getRecommendedProducts(limit: number = 4): Promise<ShopifyProduct[]> {
  try {
    const data = await shopifyFetch<ProductsResponse>({
      query: GET_ALL_PRODUCTS,
      variables: { first: limit },
    });

    return data.products.edges.map(({ node }) => node);
  } catch (error) {
    console.error('Error fetching recommended products:', error);
    return [];
  }
}

/**
 * Get canonical URL for a product
 */
export function getProductCanonicalUrl(product: ProductWithPrimaryCollection): string {
  const primaryCollection = product.metafield?.value;
  if (primaryCollection) {
    return `/${primaryCollection}/${product.handle}`;
  }
  return `/products/${product.handle}`;
}

/**
 * Verify a product belongs to a collection path
 */
export function verifyProductCollectionPath(
  product: ProductWithPrimaryCollection,
  categoryHandle: string,
  subcategoryHandle?: string
): boolean {
  const primaryCollection = product.metafield?.value;
  
  if (!primaryCollection) {
    return false;
  }

  const pathParts = primaryCollection.split('/');
  
  if (subcategoryHandle) {
    // Verify both category and subcategory match
    return pathParts[0] === categoryHandle && pathParts[1] === subcategoryHandle;
  } else {
    // Verify just category matches
    return pathParts[0] === categoryHandle;
  }
}
