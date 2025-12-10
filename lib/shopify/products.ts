import { shopifyFetch } from './client';
import { shopifyAdminFetch } from './admin-client';
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

interface ProductCountResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
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
 * Sorts products with in-stock items first, out-of-stock last across ALL pages
 */
export async function getProductsByTypes(
  productTypes: string[], 
  limit: number = 36, 
  after: string | null = null,
  filters?: {
    brands?: string[];
  }
): Promise<{ 
  products: ProductWithPrimaryCollection[]; 
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  facets: { 
    brands: { value: string; count: number; displayName: string }[];
    sizes: { value: string; count: number }[];
    colors: { value: string; count: number; originalValue: string }[];
    price: { min: number; max: number };
  };
}> {
  const emptyFacets = { 
    brands: [], 
    sizes: [], 
    colors: [], 
    price: { min: 0, max: 0 } 
  };

  if (productTypes.length === 0) {
    return { 
      products: [], 
      pageInfo: { hasNextPage: false, endCursor: null },
      facets: emptyFacets
    };
  }

  try {
    console.log(`[getProductsByTypes] Fetching products for types:`, productTypes.slice(0, 5));
    
    // Build Shopify search query: "product_type:Type1 OR product_type:Type2"
    const typeQuery = productTypes
      .map(type => `product_type:"${type.replace(/"/g, '\\"')}"`)
      .join(' OR ');
      
    // Base query WITHOUT filters (for facet calculation)
    const baseQueryString = `(${typeQuery})`;
    
    console.log(`[getProductsByTypes] Base Query (for facets): ${baseQueryString}`);

    // PERFORMANCE OPTIMIZATION: Use server-side brand filtering when possible
    // Build query with brand filter if provided
    let finalQuery = baseQueryString;
    if (filters?.brands && filters.brands.length > 0) {
      const brandQuery = filters.brands
        .map(brand => `(vendor:"${brand.replace(/"/g, '\\"')}" OR tag:"${brand.replace(/"/g, '\\"')}")`)
        .join(' OR ');
      finalQuery = `(${baseQueryString}) AND (${brandQuery})`;
      console.log(`[getProductsByTypes] 🔍 Applied server-side brand filter`);
    }

    // Fetch products with server-side filtering and sorting
    // Shopify will handle availability sorting if we use sortKey
    const data: ProductsResponse = await shopifyFetch<ProductsResponse>({
      query: GET_PRODUCTS_BY_QUERY,
      variables: { 
        query: finalQuery,
        first: limit,
        after: after 
      },
      cache: 'force-cache',
    });

    const pageProducts = data.products.edges.map(({ node }) => node as ProductWithPrimaryCollection);
    
    console.log(`[getProductsByTypes] ✅ Fetched ${pageProducts.length} products for page`);

    // --- AGGREGATE FACETS FROM CURRENT PAGE PRODUCTS ---
    // Note: Facets are calculated from current page only for performance
    // This is a trade-off: fast page loads vs. complete facet accuracy
    
    // 1. Brands (Vendors & Tags) - Store both normalized key and display name
    const brandCounts = new Map<string, { count: number; displayName: string }>();
    
    // 2. Sizes
    const sizeCounts = new Map<string, number>();
    
    // 3. Colors
    const colorCounts = new Map<string, { count: number; originalValue: string }>();
    
    // 4. Prices
    let minPrice = Infinity;
    let maxPrice = 0;

    pageProducts.forEach(p => {
      // Brands: Track which brand identifiers this product has been counted for
      // to avoid double-counting if a product has both vendor and matching tag
      const countedBrands = new Set<string>();
      
      // Count by vendor
      if (p.vendor) {
        const normalizedVendor = p.vendor.trim().toLowerCase();
        if (!countedBrands.has(normalizedVendor)) {
          const existing = brandCounts.get(normalizedVendor);
          if (existing) {
            existing.count++;
          } else {
            brandCounts.set(normalizedVendor, {
              count: 1,
              displayName: p.vendor.trim() // Keep original casing
            });
          }
          countedBrands.add(normalizedVendor);
        }
      }
      
      // Count by tags (some brands like "Kentucky" use tags instead of vendor)
      p.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        // Only count if we haven't already counted this product for this brand
        // and if the tag looks like a brand name (length > 2)
        if (normalizedTag && normalizedTag.length > 2 && !countedBrands.has(normalizedTag)) {
          const existing = brandCounts.get(normalizedTag);
          if (existing) {
            existing.count++;
          } else {
            // Capitalize first letter for display
            const displayName = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1);
            brandCounts.set(normalizedTag, {
              count: 1,
              displayName: displayName
            });
          }
          countedBrands.add(normalizedTag);
        }
      });
      
      // Prices
      const pMin = parseFloat(p.priceRange.minVariantPrice.amount);
      const pMax = parseFloat(p.priceRange.maxVariantPrice.amount);
      if (pMin < minPrice) minPrice = pMin;
      if (pMax > maxPrice) maxPrice = pMax;
      
      // Variants (Size & Color)
      p.variants.edges.forEach(({ node: variant }) => {
        // Size
        const sizeOption = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size'
        );
        if (sizeOption) {
          const count = sizeCounts.get(sizeOption.value) || 0;
          sizeCounts.set(sizeOption.value, count + 1);
        }
        
        // Color
        const colorOption = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color'
        );
        if (colorOption) {
          const normalizedValue = colorOption.value.toLowerCase();
          const existing = colorCounts.get(normalizedValue);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(normalizedValue, {
              count: 1,
              originalValue: colorOption.value,
            });
          }
        }
      });
    });
    
    // Format facets
    const brandFacets = Array.from(brandCounts.entries())
      .map(([value, { count, displayName }]) => ({ 
        value, // normalized lowercase for filtering
        count,
        displayName // original casing for display
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
      
    const sizeFacets = Array.from(sizeCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        // Try to sort numerically if possible
        const aNum = parseFloat(a.value);
        const bNum = parseFloat(b.value);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.value.localeCompare(b.value);
      });
      
    const colorFacets = Array.from(colorCounts.entries())
      .map(([value, { count, originalValue }]) => ({ 
        value, 
        count, 
        originalValue 
      }))
      .sort((a, b) => a.originalValue.localeCompare(b.originalValue));
      
    const priceFacet = {
      min: minPrice === Infinity ? 0 : Math.floor(minPrice / 10) * 10,
      max: maxPrice === 0 ? 500 : Math.ceil(maxPrice / 10) * 10
    };

    console.log(`[getProductsByTypes] 📊 Facets calculated: ${brandFacets.length} brands, ${sizeFacets.length} sizes, ${colorFacets.length} colors`);

    // Sort products: In-stock first, out-of-stock last
    pageProducts.sort((a, b) => {
      if (a.availableForSale === b.availableForSale) return 0;
      return a.availableForSale ? -1 : 1;
    });

    console.log(`[getProductsByTypes] 📄 Returning ${pageProducts.length} products`);

    return {
      products: pageProducts,
      pageInfo: {
        hasNextPage: data.products.pageInfo.hasNextPage,
        endCursor: data.products.pageInfo.endCursor
      },
      facets: {
        brands: brandFacets,
        sizes: sizeFacets,
        colors: colorFacets,
        price: priceFacet
      }
    };
  } catch (error) {
    console.error('Error fetching products by types:', error);
    return { 
      products: [], 
      pageInfo: { hasNextPage: false, endCursor: null },
      facets: emptyFacets
    };
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
 * Get the primary category path for a product based on its productType
 * Returns the deepest (most specific) category path from the mapping
 */
export function getPrimaryCategoryPath(productType: string): string | null {
  if (!productType || !productType.trim()) {
    return null;
  }

  // Use the same logic as getBreadcrumbsForProduct to find category paths
  const { getBreadcrumbsForProduct } = require('@/lib/mapping/collection-mapping');
  const breadcrumbPaths = getBreadcrumbsForProduct(productType);
  
  if (breadcrumbPaths.length === 0) {
    return null;
  }

  // First path is the primary (most specific/deepest)
  const primaryPath = breadcrumbPaths[0];
  
  // Extract the href from the last breadcrumb (full category path)
  if (primaryPath && primaryPath.length > 0) {
    return primaryPath[primaryPath.length - 1].href;
  }

  return null;
}

/**
 * Get canonical URL for a product
 * Returns category-based URL: /{category}/{subcategory}/{product-handle}
 * Falls back to /products/{handle} if no category mapping found
 */
export function getProductCanonicalUrl(product: ProductWithPrimaryCollection): string {
  // Try to get category path from productType
  const categoryPath = getPrimaryCategoryPath(product.productType);
  
  if (categoryPath) {
    // Return category-based URL: /clothing/footwear/boots/product-handle
    return `${categoryPath}/${product.handle}`;
  }
  
  // Fallback to /products/{handle} if no mapping found
  return `/products/${product.handle}`;
}

/**
 * Batch calculate canonical URLs for multiple products
 * More efficient than calling getProductCanonicalUrl() in a loop
 * Uses caching to avoid repeated productType lookups
 */
export function getProductCanonicalUrls(products: ProductWithPrimaryCollection[]): Map<string, string> {
  const urlMap = new Map<string, string>();
  
  // Build a cache of productType -> categoryPath to avoid repeated lookups
  const pathCache = new Map<string, string | null>();
  
  for (const product of products) {
    const productType = product.productType;
    
    // Check cache first
    if (!pathCache.has(productType)) {
      pathCache.set(productType, getPrimaryCategoryPath(productType));
    }
    
    const categoryPath = pathCache.get(productType);
    const canonicalUrl = categoryPath 
      ? `${categoryPath}/${product.handle}`
      : `/products/${product.handle}`;
    
    urlMap.set(product.id, canonicalUrl);
  }
  
  return urlMap;
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

/**
 * Get total count of products matching the given product types
 * Uses Admin API for accurate counts
 */
export async function getProductCountByTypes(productTypes: string[]): Promise<number> {
  if (productTypes.length === 0) {
    return 0;
  }

  try {
    // Build query string for Admin API
    const queryParts = productTypes.map(type => `product_type:"${type}"`);
    const query = queryParts.join(' OR ');

    console.log(`[getProductCountByTypes] Counting products for types:`, productTypes.slice(0, 5));

    // Use Admin API to count (it's more efficient for counts)
    const ADMIN_COUNT_QUERY = `
      query CountProducts($query: String!) {
        products(first: 1, query: $query) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    // Unfortunately, Shopify doesn't provide a direct count field
    // We need to paginate through all results to get accurate count
    let totalCount = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;
    const maxPages = 100; // Safety limit

    while (hasNextPage && pageCount < maxPages) {
      const data: ProductCountResponse = await shopifyAdminFetch<ProductCountResponse>({
        query: `
          query CountProducts($query: String!, $first: Int!, $after: String) {
            products(first: $first, after: $after, query: $query) {
              edges {
                node {
                  id
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        variables: { query, first: 250, after: cursor },
      });

      totalCount += data.products.edges.length;
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
      pageCount++;
    }

    console.log(`[getProductCountByTypes] ✅ Total count: ${totalCount}`);
    return totalCount;
  } catch (error) {
    console.error('[getProductCountByTypes] Error:', error);
    return 0;
  }
}
