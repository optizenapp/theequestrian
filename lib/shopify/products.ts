import { shopifyFetch } from './client';
import { shopifyAdminFetch } from './admin-client';
import { GET_PRODUCT_BY_HANDLE, GET_PRODUCT_BY_ID, GET_ALL_PRODUCTS, GET_PRODUCTS_BY_QUERY } from './queries';
import { normalizeColor, isColorValue } from '@/lib/utils/product-options';
import { getProductAllocationByHandle, getProductAllocationByProductId, getProductAllocationMapByProductIds } from '@/lib/db/product-allocations';
import { CATEGORY_PRODUCTS_CACHE_MS } from '@/lib/config/collection-cache';
import { getProductOverridesByHandles, getProductOverrideByHandle } from '@/lib/content/product-overrides';
import { filterExcludedFrontendVendors, isExcludedFrontendVendor } from './vendor-visibility';
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

// Cache for product collections by productTypes query
let productsByTypesCache: Map<string, {
  products: ProductWithPrimaryCollection[];
  timestamp: number;
}> = new Map();

// Cache for products by category (from database allocations)
let productsByCategoryCache: Map<string, {
  products: ProductWithPrimaryCollection[];
  timestamp: number;
}> = new Map();

// Function to clear category cache (useful for debugging)
export function clearCategoryCache() {
  productsByCategoryCache.clear();
  console.log('[Cache] Category cache cleared');
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Build Shopify search query with filters
 * Converts productTypes and filters into a Shopify search query string
 * 
 * @example
 * buildShopifyQuery(['Horse Rugs'], { brands: ['Ariat'], sizes: ['6.0'] })
 * // Returns: '(product_type:"Horse Rugs") AND (vendor:Ariat) AND (tag:6.0)'
 */
function buildShopifyQuery(
  productTypes: string[],
  filters?: {
    brands?: string[];
    sizes?: string[];
    colors?: string[];
  }
): string {
  // Base query: product types
  const typeQuery = productTypes
    .map(type => `product_type:"${type.replace(/"/g, '\\"')}"`)
    .join(' OR ');
  
  let query = `(${typeQuery})`;
  
  // Add brand filter (vendor field)
  // Note: Some brands use tags instead of vendor, but we'll handle that in facet calculation
  if (filters?.brands && filters.brands.length > 0) {
    const brandQuery = filters.brands
      .map(brand => {
        const escapedBrand = brand.replace(/"/g, '\\"');
        // Search in both vendor field and tags for maximum coverage
        return `(vendor:"${escapedBrand}" OR tag:"${escapedBrand}")`;
      })
      .join(' OR ');
    query += ` AND (${brandQuery})`;
  }
  
  // Add size filter (tag field)
  if (filters?.sizes && filters.sizes.length > 0) {
    const sizeQuery = filters.sizes
      .map(size => `tag:"${size.replace(/"/g, '\\"')}"`)
      .join(' OR ');
    query += ` AND (${sizeQuery})`;
  }
  
  // Add color filter (tag field)
  if (filters?.colors && filters.colors.length > 0) {
    const colorQuery = filters.colors
      .map(color => `tag:"${color.replace(/"/g, '\\"')}"`)
      .join(' OR ');
    query += ` AND (${colorQuery})`;
  }
  
  return query;
}

// Tags to exclude from brand facets (these are not brands)
const NON_BRAND_TAGS = new Set([
  // Colors
  'black', 'white', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'gray',
  'navy', 'beige', 'tan', 'cream', 'silver', 'gold', 'bronze',
  // Sizes
  'small', 'medium', 'large', 'xl', 'xxl', 'xs', 'one size',
  // Product types/categories
  'birds', 'dog treats', 'cat food', 'dog flea treatment', 'all wormer', 'shampoo', 'litter',
  'air & freeze dried', 'rogz harness', 'zeez dog coats',
  // Generic tags
  'australia only', 'new', 'sale', 'clearance', 'featured', 'best seller',
  // Store name (not a brand to filter by)
  'ascot saddlery', 'ascotheavy', '#heavy',
]);

// Vendors to exclude from brand facets (store name, not customer-facing brands)
const EXCLUDED_VENDORS = new Set([
  'ascot saddlery',
  'the equestrian',
]);

/**
 * Get a product by its handle
 */
export async function getProductByHandle(
  handle: string,
  options?: { cache?: RequestCache }
): Promise<ShopifyProduct | null> {
  try {
    const data = await shopifyFetch<ProductResponse>({
      query: GET_PRODUCT_BY_HANDLE,
      variables: { handle },
      cache: options?.cache ?? 'force-cache',
    });

    if (!data.product || isExcludedFrontendVendor(data.product.vendor)) {
      return null;
    }

    return data.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function getProductById(
  id: string,
  options?: { cache?: RequestCache }
): Promise<ShopifyProduct | null> {
  try {
    const data = await shopifyFetch<ProductResponse>({
      query: GET_PRODUCT_BY_ID,
      variables: { id },
      cache: options?.cache ?? 'force-cache',
    });

    if (!data.product || isExcludedFrontendVendor(data.product.vendor)) {
      return null;
    }

    return data.product;
  } catch (error) {
    console.error('Error fetching product by id:', error);
    return null;
  }
}

export function hasProductImage(product: Pick<ShopifyProduct, 'images'> | null | undefined): boolean {
  const primaryImage = product?.images?.edges?.[0]?.node;
  return typeof primaryImage?.url === 'string' && primaryImage.url.trim().length > 0;
}

async function filterPublishedForHeadless<T extends { handle: string }>(products: T[]): Promise<T[]> {
  if (products.length === 0) return products;
  const overrideMap = await getProductOverridesByHandles(products.map((product) => product.handle));
  return products.filter((product) => overrideMap.get(product.handle)?.is_published_headless !== false);
}

function filterProductsWithImages<T extends Pick<ShopifyProduct, 'images'>>(products: T[]): T[] {
  if (products.length === 0) return products;
  return products.filter((product) => hasProductImage(product));
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

    const productsWithoutExcludedVendors = filterExcludedFrontendVendors(allProducts);
    if (productsWithoutExcludedVendors.length !== allProducts.length) {
      console.log(
        `[getAllProducts] 🚫 Vendor exclusion applied: ${allProducts.length} → ${productsWithoutExcludedVendors.length} products`
      );
    }

    console.log(`[getAllProducts] ✅ Fetched ${productsWithoutExcludedVendors.length} total products`);
    
    // Cache the results
    productsCache = {
      data: productsWithoutExcludedVendors,
      timestamp: now,
    };
    
    return productsWithoutExcludedVendors;
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}

/**
 * Check if a product belongs to a specific category path
 * LEGACY FUNCTION - Only used for old getProductsByTypes() flow
 * New code should use getProductsByCategory() instead
 * 
 * Priority order:
 * 1. primary_collection metafield
 * 2. productType mapping (legacy fallback)
 * 
 * NOTE: Does NOT check product_category_assignments to avoid connection exhaustion
 */
async function productBelongsToCategory(
  product: ProductWithPrimaryCollection,
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Promise<boolean> {
  // Priority 1: Check primary_collection metafield
  if (product.metafield?.value) {
    const metafieldPath = product.metafield.value.split('/');
    if (subsubcategory) {
      return metafieldPath[0] === category && 
             metafieldPath[1] === subcategory && 
             metafieldPath[2] === subsubcategory;
    } else if (subcategory) {
      return metafieldPath[0] === category && metafieldPath[1] === subcategory;
    } else {
      return metafieldPath[0] === category;
    }
  }

  // Priority 2: Derive from productType mapping (legacy)
  if (product.productType) {
    const categoryPath = await getPrimaryCategoryPath(product.productType);
    if (categoryPath) {
      const pathParts = categoryPath.split('/').filter(p => p);
      if (subsubcategory) {
        return pathParts.length >= 3 &&
               pathParts[0] === category &&
               pathParts[1] === subcategory &&
               pathParts[2] === subsubcategory;
      } else if (subcategory) {
        return pathParts.length >= 2 &&
               pathParts[0] === category &&
               pathParts[1] === subcategory;
      } else {
        return pathParts.length >= 1 && pathParts[0] === category;
      }
    }
  }

  return false;
}

/**
 * Get products by product types (optimized for collection pages)
 * Uses Shopify's query parameter to filter on the server side
 * Sorts products with in-stock items first, out-of-stock last across ALL pages
 * 
 * @param productTypes - Array of product types to filter by
 * @param limit - Number of products per page
 * @param after - Cursor for pagination
 * @param filters - Optional filters (brands, sizes, colors)
 * @param categoryFilter - Optional category path to filter products (e.g., 'clothing' or 'horse/rugs')
 */
export async function getProductsByTypes(
  productTypes: string[], 
  limit: number = 36, 
  after: string | null = null,
  filters?: {
    brands?: string[];
    sizes?: string[];
    colors?: string[];
  },
  categoryFilter?: {
    category: string;
    subcategory?: string;
    subsubcategory?: string;
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
      totalCount: 0,
      facets: emptyFacets
    };
  }

  try {
    console.log(`[getProductsByTypes] Fetching products for types:`, productTypes.slice(0, 5));
    if (filters && Object.keys(filters).length > 0) {
      console.log(`[getProductsByTypes] Filters applied:`, filters);
    }
    
    // Build Shopify search query with filters included
    // This lets Shopify do the filtering server-side, reducing data transfer
    const baseQueryString = buildShopifyQuery(productTypes, filters);
    
    console.log(`[getProductsByTypes] Query:`, baseQueryString);
    
    // Check cache first (cache key includes filters for accurate caching)
    const cacheKey = `${baseQueryString}|${JSON.stringify(filters || {})}`;
    const now = Date.now();
    const cached = productsByTypesCache.get(cacheKey);
    
    let allProductsUnfiltered: ProductWithPrimaryCollection[];
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`[getProductsByTypes] ✅ Using cached products (${cached.products.length} products)`);
      allProductsUnfiltered = cached.products;
    } else {
      console.log(`[getProductsByTypes] 📥 Fetching ALL products for facets (cache miss)`);
      
      // Fetch ALL products for accurate facets
      allProductsUnfiltered = [];
      let hasNextPage = true;
      let cursor: string | null = null;
      const maxPages = 50;
      let pageCount = 0;

      while (hasNextPage && pageCount < maxPages) {
        const paginationCursor = cursor;
        const data: ProductsResponse = await shopifyFetch<ProductsResponse>({
          query: GET_PRODUCTS_BY_QUERY,
          variables: { 
            query: baseQueryString,
            first: 250,
            after: paginationCursor 
          },
          cache: 'force-cache',
        });

        allProductsUnfiltered.push(...data.products.edges.map(({ node }) => node as ProductWithPrimaryCollection));
        hasNextPage = data.products.pageInfo.hasNextPage;
        cursor = data.products.pageInfo.endCursor;
        pageCount++;
      }

      console.log(`[getProductsByTypes] ✅ Fetched ${allProductsUnfiltered.length} total products in ${pageCount} pages`);
      
      // Cache the results
      productsByTypesCache.set(cacheKey, {
        products: allProductsUnfiltered,
        timestamp: now
      });
    }

    const beforeVendorFilter = allProductsUnfiltered.length;
    allProductsUnfiltered = filterExcludedFrontendVendors(allProductsUnfiltered);
    if (allProductsUnfiltered.length !== beforeVendorFilter) {
      console.log(`[getProductsByTypes] 🚫 Vendor exclusion applied: ${beforeVendorFilter} → ${allProductsUnfiltered.length} products`);
    }
    const beforePublishFilter = allProductsUnfiltered.length;
    allProductsUnfiltered = await filterPublishedForHeadless(allProductsUnfiltered);
    if (allProductsUnfiltered.length !== beforePublishFilter) {
      console.log(`[getProductsByTypes] 👁️ Visibility filter applied: ${beforePublishFilter} → ${allProductsUnfiltered.length} products`);
    }
    const beforeImageFilter = allProductsUnfiltered.length;
    allProductsUnfiltered = filterProductsWithImages(allProductsUnfiltered);
    if (allProductsUnfiltered.length !== beforeImageFilter) {
      console.log(`[getProductsByTypes] 🖼️ Image filter applied: ${beforeImageFilter} → ${allProductsUnfiltered.length} products`);
    }

    // --- AGGREGATE FACETS FROM ALL PRODUCTS ---
    
    // 1. Brands (Vendors & Tags) - Store both normalized key and display name
    const brandCounts = new Map<string, { count: number; displayName: string }>();
    
    // 2. Sizes
    const sizeCounts = new Map<string, number>();
    
    // 3. Colors
    const colorCounts = new Map<string, { count: number; originalValue: string }>();
    
    // 4. Prices
    let minPrice = Infinity;
    let maxPrice = 0;

    allProductsUnfiltered.forEach(p => {
      // Brands: Track which brand identifiers this product has been counted for
      // to avoid double-counting if a product has both vendor and matching tag
      const countedBrands = new Set<string>();
      
      // Count by vendor (skip excluded vendors like store name)
      if (p.vendor) {
        const normalizedVendor = p.vendor.trim().toLowerCase();
        
        if (!EXCLUDED_VENDORS.has(normalizedVendor) && !countedBrands.has(normalizedVendor)) {
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
        
        // Skip non-brand tags (colors, sizes, product types, etc.)
        if (NON_BRAND_TAGS.has(normalizedTag)) {
          return;
        }
        
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
          // Skip if it looks like a color (e.g. "Black", "Navy")
          // This prevents colors from appearing in the Size filter
          if (!isColorValue(sizeOption.value)) {
            const count = sizeCounts.get(sizeOption.value) || 0;
            sizeCounts.set(sizeOption.value, count + 1);
          }
        }
        
        // Color
        const colorOption = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color'
        );
        if (colorOption) {
          const normalizedValue = normalizeColor(colorOption.value);
          const existing = colorCounts.get(normalizedValue);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(normalizedValue, {
              count: 1,
              originalValue: colorOption.value, // Keep original casing/format for display (optional, or pick best one)
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

    // --- FILTER PRODUCTS BY CATEGORY ---
    // Filter to only include products that belong to the specified category
    let filteredProducts = [...allProductsUnfiltered];
    
    if (categoryFilter) {
      const beforeCategoryFilter = filteredProducts.length;
      filteredProducts = filteredProducts.filter(product => 
        productBelongsToCategory(
          product,
          categoryFilter.category,
          categoryFilter.subcategory,
          categoryFilter.subsubcategory
        )
      );
      console.log(`[getProductsByTypes] 🔍 Category filter applied: ${beforeCategoryFilter} → ${filteredProducts.length} products (category: ${categoryFilter.category}${categoryFilter.subcategory ? `/${categoryFilter.subcategory}` : ''}${categoryFilter.subsubcategory ? `/${categoryFilter.subsubcategory}` : ''})`);
    }
    
    console.log(`[getProductsByTypes] ✅ Using ${filteredProducts.length} products (pre-filtered by Shopify query${categoryFilter ? ' + category filter' : ''})`);

    // Sort products: In-stock first, out-of-stock last
    filteredProducts.sort((a, b) => {
      if (a.availableForSale === b.availableForSale) return 0;
      return a.availableForSale ? -1 : 1;
    });

    // Handle pagination manually
    let page = 0;
    if (after) {
      const match = after.match(/^page:(\d+)$/);
      if (match) {
        page = parseInt(match[1]);
      }
    }
    
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredProducts.length;

    console.log(`[getProductsByTypes] 📄 Page ${page}: Returning ${paginatedProducts.length} products (${startIndex}-${endIndex} of ${filteredProducts.length})`);

    return {
      products: paginatedProducts,
      pageInfo: {
        hasNextPage: hasMore,
        endCursor: hasMore ? `page:${page + 1}` : null
      },
      totalCount: filteredProducts.length, // Return total count from cached data
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
      totalCount: 0,
      facets: emptyFacets
    };
  }
}

/**
 * Get recommended products (limit to specified number)
 * improved to filter by productType if provided
 */
export async function getRecommendedProducts(limit: number = 4, productType?: string, excludeHandle?: string): Promise<ShopifyProduct[]> {
  try {
    let products: ShopifyProduct[] = [];
    const applyRelatedFilters = async (source: ShopifyProduct[]) => {
      let filtered = filterExcludedFrontendVendors(source);
      filtered = await filterPublishedForHeadless(filtered);
      if (excludeHandle) {
        filtered = filtered.filter((product) => product.handle !== excludeHandle);
      }
      return filterProductsWithImages(filtered);
    };
    const collectWithPagination = async ({
      query,
      fallbackAllProducts,
    }: {
      query?: string;
      fallbackAllProducts?: boolean;
    }): Promise<ShopifyProduct[]> => {
      const collected: ShopifyProduct[] = [];
      const seenIds = new Set<string>();
      let hasNextPage = true;
      let cursor: string | null = null;
      let pages = 0;
      const maxPages = 5;

      while (hasNextPage && pages < maxPages && collected.length < limit) {
        const data: ProductsResponse = fallbackAllProducts
          ? await shopifyFetch<ProductsResponse>({
              query: GET_ALL_PRODUCTS,
              variables: { first: 50, after: cursor },
            })
          : await shopifyFetch<ProductsResponse>({
              query: GET_PRODUCTS_BY_QUERY,
              variables: {
                query: query || '',
                first: 50,
                after: cursor,
              },
            });

        const pageProducts = data.products?.edges?.map(({ node }) => node) || [];
        const filteredPageProducts = await applyRelatedFilters(pageProducts);

        for (const product of filteredPageProducts) {
          if (!seenIds.has(product.id)) {
            seenIds.add(product.id);
            collected.push(product);
            if (collected.length >= limit) break;
          }
        }

        hasNextPage = data.products?.pageInfo?.hasNextPage ?? false;
        cursor = data.products?.pageInfo?.endCursor ?? null;
        pages += 1;
      }

      return collected;
    };

    // 1. Try to fetch by product type for relevance
    if (productType) {
      console.log(`[getRecommendedProducts] Fetching related products for type: ${productType}`);
      products = await collectWithPagination({
        query: `product_type:"${productType}"`,
      });
    } 

    // 2. Fallback to "all products" (latest) if no type or no post-filter results
    if (products.length === 0) {
      console.log(`[getRecommendedProducts] Fallback: Fetching latest products`);
      products = await collectWithPagination({
        fallbackAllProducts: true,
      });
    }

    if (products.length === 0) {
      console.warn('[getRecommendedProducts] No related products returned', {
        productType,
        excludeHandle,
      });
    } else {
      console.log(`[getRecommendedProducts] Found ${products.length} products (limit: ${limit})`);
    }
    return products.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recommended products:', error);
    return [];
  }
}

interface CartItem {
  handle: string;
  productType: string;
  vendor: string;
  price: number;
}

interface ScoredProduct {
  product: ShopifyProduct;
  score: number;
  reasons: string[];
}

/**
 * Get smart cart recommendations based on items currently in cart
 * Uses intelligent scoring algorithm to suggest relevant products
 * 
 * @param cartItems - Array of items currently in cart with product details
 * @param limit - Number of recommendations to return (default: 4)
 * @returns Array of recommended products sorted by relevance score
 */
export async function getSmartCartRecommendations(
  cartItems: CartItem[],
  limit: number = 4
): Promise<ShopifyProduct[]> {
  try {
    console.log(`[getSmartCartRecommendations] Analyzing cart with ${cartItems.length} items`);
    
    // If cart is empty, return generic recommendations
    if (cartItems.length === 0) {
      console.log(`[getSmartCartRecommendations] Empty cart, returning generic recommendations`);
      return getRecommendedProducts(limit);
    }

    // Extract unique product types and brands from cart
    const cartProductTypes = [...new Set(cartItems.map(item => item.productType))];
    const cartBrands = [...new Set(cartItems.map(item => item.vendor).filter(Boolean))];
    const cartHandles = new Set(cartItems.map(item => item.handle));
    
    // Calculate average price range in cart
    const avgPrice = cartItems.reduce((sum, item) => sum + item.price, 0) / cartItems.length;
    const minPriceRange = avgPrice * 0.5; // 50% lower
    const maxPriceRange = avgPrice * 2; // 200% higher
    
    console.log(`[getSmartCartRecommendations] Cart analysis:`, {
      productTypes: cartProductTypes,
      brands: cartBrands,
      avgPrice,
      priceRange: [minPriceRange, maxPriceRange]
    });

    // Import complementary product mappings
    const { getComplementaryTypes } = await import('@/lib/mapping/complementary-products');
    const complementaryTypes = getComplementaryTypes(cartProductTypes);
    
    console.log(`[getSmartCartRecommendations] Complementary types:`, complementaryTypes);

    // Fetch candidates from multiple sources
    const candidateProducts = new Map<string, ShopifyProduct>();
    
    // 1. Fetch products of same types (50% weight)
    if (cartProductTypes.length > 0) {
      const sameTypeQuery = cartProductTypes
        .map(type => `product_type:"${type.replace(/"/g, '\\"')}"`)
        .join(' OR ');
      
      const sameTypeData = await shopifyFetch<ProductsResponse>({
        query: GET_PRODUCTS_BY_QUERY,
        variables: { 
          query: sameTypeQuery,
          first: 20
        },
      });
      
      sameTypeData.products?.edges.forEach(({ node }) => {
        if (!cartHandles.has(node.handle)) {
          candidateProducts.set(node.id, node);
        }
      });
    }
    
    // 2. Fetch products from same brands (30% weight)
    if (cartBrands.length > 0) {
      const sameBrandQuery = cartBrands
        .map(brand => `vendor:"${brand.replace(/"/g, '\\"')}"`)
        .join(' OR ');
      
      const sameBrandData = await shopifyFetch<ProductsResponse>({
        query: GET_PRODUCTS_BY_QUERY,
        variables: { 
          query: sameBrandQuery,
          first: 20
        },
      });
      
      sameBrandData.products?.edges.forEach(({ node }) => {
        if (!cartHandles.has(node.handle)) {
          candidateProducts.set(node.id, node);
        }
      });
    }
    
    // 3. Fetch complementary products (20% weight)
    if (complementaryTypes.length > 0) {
      const complementaryQuery = complementaryTypes
        .map(type => `product_type:"${type.replace(/"/g, '\\"')}"`)
        .join(' OR ');
      
      const complementaryData = await shopifyFetch<ProductsResponse>({
        query: GET_PRODUCTS_BY_QUERY,
        variables: { 
          query: complementaryQuery,
          first: 20
        },
      });
      
      complementaryData.products?.edges.forEach(({ node }) => {
        if (!cartHandles.has(node.handle)) {
          candidateProducts.set(node.id, node);
        }
      });
    }
    
    console.log(`[getSmartCartRecommendations] Found ${candidateProducts.size} candidate products`);
    
    if (candidateProducts.size === 0) {
      console.log(`[getSmartCartRecommendations] No candidates found, falling back to generic`);
      return getRecommendedProducts(limit);
    }
    
    // Score each candidate product
    const scoredProducts: ScoredProduct[] = Array.from(candidateProducts.values())
      .filter((product) => !isExcludedFrontendVendor(product.vendor))
      .filter((product) => hasProductImage(product))
      .map(product => {
      let score = 0;
      const reasons: string[] = [];
      
      // Same product type as cart item: +10 points
      if (cartProductTypes.includes(product.productType)) {
        score += 10;
        reasons.push('same category');
      }
      
      // Same brand as cart item: +5 points
      if (cartBrands.includes(product.vendor)) {
        score += 5;
        reasons.push('same brand');
      }
      
      // Complementary category: +8 points
      if (complementaryTypes.includes(product.productType)) {
        score += 8;
        reasons.push('complementary');
      }
      
      // Price range similar to cart items: +3 points
      const productPrice = parseFloat(product.priceRange.minVariantPrice.amount);
      if (productPrice >= minPriceRange && productPrice <= maxPriceRange) {
        score += 3;
        reasons.push('similar price');
      }
      
      // Currently in stock: +2 points
      if (product.availableForSale) {
        score += 2;
        reasons.push('in stock');
      }
      
      return { product, score, reasons };
    });
    
    // Sort by score (highest first) and add diversity penalty for duplicate types
    scoredProducts.sort((a, b) => b.score - a.score);
    
    // Apply diversity filter: prefer variety in product types
    const selectedProducts: ShopifyProduct[] = [];
    const selectedTypes = new Set<string>();
    const maxPerType = 2; // Maximum 2 products of same type
    const typeCount = new Map<string, number>();
    
    for (const { product, score, reasons } of scoredProducts) {
      if (selectedProducts.length >= limit) break;
      
      const currentCount = typeCount.get(product.productType) || 0;
      
      // Allow product if we haven't hit the per-type limit
      if (currentCount < maxPerType) {
        selectedProducts.push(product);
        selectedTypes.add(product.productType);
        typeCount.set(product.productType, currentCount + 1);
        
        console.log(`[getSmartCartRecommendations] Selected: ${product.title} (score: ${score}, reasons: ${reasons.join(', ')})`);
      }
    }
    
    // If we don't have enough products, fill with highest scoring regardless of type
    if (selectedProducts.length < limit) {
      for (const { product } of scoredProducts) {
        if (selectedProducts.length >= limit) break;
        if (!selectedProducts.find(p => p.id === product.id)) {
          selectedProducts.push(product);
        }
      }
    }
    
    console.log(`[getSmartCartRecommendations] Returning ${selectedProducts.length} recommendations with ${selectedTypes.size} unique types`);
    
    return selectedProducts;
  } catch (error) {
    console.error('Error in getSmartCartRecommendations:', error);
    // Fallback to generic recommendations
    return getRecommendedProducts(limit);
  }
}

// Module-level cache for productType -> categoryPath mappings
// This persists across requests in the same Node.js process
const categoryPathCache = new Map<string, string | null>();

/**
 * Get the primary category path for a product based on its productType
 * Returns the deepest (most specific) category path from the mapping
 * OPTIMIZED: Uses module-level cache to avoid repeated CSV parsing
 */
export async function getPrimaryCategoryPath(productType: string): Promise<string | null> {
  if (!productType || !productType.trim()) {
    return null;
  }

  // Check module-level cache first (persists across requests)
  if (categoryPathCache.has(productType)) {
    return categoryPathCache.get(productType) || null;
  }

  // Use the same logic as getBreadcrumbsForProduct to find category paths
  const { getBreadcrumbsForProduct } = await import('@/lib/mapping/collection-mapping');
  const breadcrumbPaths = await getBreadcrumbsForProduct(productType);
  
  let result: string | null = null;

  if (breadcrumbPaths.length > 0) {
  // First path is the primary (most specific/deepest)
  const primaryPath = breadcrumbPaths[0];
  
  // Extract the href from the last breadcrumb (full category path)
  if (primaryPath && primaryPath.length > 0) {
      result = primaryPath[primaryPath.length - 1].href;
    }
  }

  // Cache the result (even if null) to avoid repeated lookups
  categoryPathCache.set(productType, result);
  
  return result;
}

/**
 * Get canonical URL for a product
 * Returns category-based URL: /{category}/{subcategory}/{product-handle}
 * Falls back to /products/{handle} if no category mapping found
 * 
 * Priority:
 * 0. Admin allocation (canonical category override)
 * 1. Use primary_collection metafield if set
 * 2. Derive from productType via mapping
 * 3. Fallback to /products/{handle}
 */
export async function getProductCanonicalUrl(
  product: Pick<ShopifyProduct, 'id' | 'handle' | 'productType'> & { metafield?: { value: string } | null }
): Promise<string> {
  const override = await getProductOverrideByHandle(product.handle);
  const slugOverride = override?.use_headless_slug ? override?.slug_override : null;
  const resolvedHandle = slugOverride || product.handle;

  // Priority 0: Admin allocation (deepest canonical override)
  const allocation = product.id
    ? await getProductAllocationByProductId(product.id)
    : await getProductAllocationByHandle(product.handle);
  if (allocation?.canonical_path) {
    if (slugOverride) {
      const parts = allocation.canonical_path.split('/');
      parts[parts.length - 1] = resolvedHandle;
      return parts.join('/');
    }
    return allocation.canonical_path;
  }

  // Priority 1: Use metafield if set
  if (product.metafield?.value) {
    return `/${product.metafield.value}/${resolvedHandle}`;
  }
  
  // Second priority: Try to get category path from productType
  const categoryPath = await getPrimaryCategoryPath(product.productType);
  
  if (categoryPath) {
    // Return category-based URL: /clothing/footwear/boots/product-handle
    return `${categoryPath}/${resolvedHandle}`;
  }
  
  // Fallback to /products/{handle} if no mapping found
  return `/products/${resolvedHandle}`;
}

/**
 * Batch calculate canonical URLs for multiple products
 * More efficient than calling getProductCanonicalUrl() in a loop
 * Uses caching to avoid repeated productType lookups
 * 
 * Priority:
 * 0. Admin allocation (canonical category override)
 * 1. Use primary_collection metafield if set
 * 2. Derive from productType via mapping
 * 3. Fallback to /products/{handle} (legacy; product sitemap omits these URLs)
 */
export async function getProductCanonicalUrls(
  products: Array<Pick<ShopifyProduct, 'id' | 'handle' | 'productType'> & { metafield?: { value: string } | null }>
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const allocationMap = await getProductAllocationMapByProductIds(
    products.map((product) => product.id)
  );
  const overrideMap = await getProductOverridesByHandles(products.map((product) => product.handle));
  
  // Build a cache of productType -> categoryPath to avoid repeated productType lookups
  const pathCache = new Map<string, string | null>();
  
  for (const product of products) {
    let canonicalUrl: string;
    
    const override = overrideMap.get(product.handle);
    const slugOverride = override?.use_headless_slug ? override?.slug_override : null;
    const resolvedHandle = slugOverride || product.handle;
    const allocated = allocationMap.get(product.id);
    if (allocated) {
      if (slugOverride) {
        const parts = allocated.split('/');
        parts[parts.length - 1] = resolvedHandle;
        canonicalUrl = parts.join('/');
      } else {
        canonicalUrl = allocated;
      }
    } else if (product.metafield?.value) {
      canonicalUrl = `/${product.metafield.value}/${resolvedHandle}`;
    } else {
      // Second priority: Try productType mapping
      const productType = product.productType;
      
      // Check cache first
      if (!pathCache.has(productType)) {
        pathCache.set(productType, await getPrimaryCategoryPath(productType));
      }
      
      const categoryPath = pathCache.get(productType);
      canonicalUrl = categoryPath 
        ? `${categoryPath}/${resolvedHandle}`
        : `/products/${resolvedHandle}`;
    }
    
    urlMap.set(product.id, canonicalUrl);
  }
  
  return urlMap;
}

/**
 * Verify a product belongs to a collection path
 */
export function verifyProductCollectionPath(
  product: Pick<ShopifyProduct, 'metafield' | 'productType' | 'handle'>,
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
/**
 * Get products allocated to a specific category from product_category_assignments table
 * This is the NEW method for fetching products by category (replaces product type mapping)
 */
export async function getProductsByCategory(
  categoryPath: string,
  limit: number = 36,
  after: string | null = null,
  filters?: {
    brands?: string[];
    sizes?: string[];
    colors?: string[];
  },
  sortBy?: 'featured' | 'on-sale' | 'newest' | 'oldest' | 'price-asc' | 'price-desc'
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
  const emptyResult = {
    products: [],
    pageInfo: { hasNextPage: false, endCursor: null },
    totalCount: 0,
    facets: { brands: [], sizes: [], colors: [], price: { min: 0, max: 0 } }
  };

  try {
    // DB-first path is now the default for category pages. It is the only path
    // that has access to `products.brand` (canonical brand) and the
    // `variant_options` table (size / colour facets and filtering). The
    // Shopify path is retained below as a fallback for: (a) sort=on-sale,
    // which still needs Shopify ordering, and (b) any unexpected DB failure.
    // Setting USE_DB_COLLECTIONS_FROM_POSTGRES=false explicitly opts back into
    // the legacy Shopify path for emergency use.
    const dbFirstDisabled = process.env.USE_DB_COLLECTIONS_FROM_POSTGRES === 'false';
    if (!dbFirstDisabled && sortBy !== 'on-sale') {
      try {
        const { getProductsByCategoryFromDB } = await import('@/lib/products/postgres-adapter');
        return getProductsByCategoryFromDB(categoryPath, limit, after, filters);
      } catch (dbError) {
        console.error('[getProductsByCategory] DB-first path failed, falling back to Shopify path:', dbError);
      }
    } else if (sortBy === 'on-sale') {
      console.log('[getProductsByCategory] sort=on-sale requested; using Shopify path for accurate ordering');
    }

    // Check cache first
    const now = Date.now();
    const cached = productsByCategoryCache.get(categoryPath);
    
    let allProducts: ProductWithPrimaryCollection[];
    
    // Skip cache if it has 0 products (likely from a previous error)
    if (cached && cached.products.length > 0 && (now - cached.timestamp) < CATEGORY_PRODUCTS_CACHE_MS) {
      console.log(`[getProductsByCategory] ✅ Using cached products for ${categoryPath} (${cached.products.length} products)`);
      allProducts = cached.products;
    } else {
      // Get product IDs allocated to this category (includes child categories)
      const { getProductIdsByCategory } = await import('@/lib/db/product-allocations');
      console.log(`[getProductsByCategory] Querying allocations for ${categoryPath}...`);
      
      const productIds = await getProductIdsByCategory(categoryPath);

      if (productIds.length === 0) {
        console.log(`[getProductsByCategory] ❌ No products allocated to ${categoryPath} - returning empty`);
        return emptyResult;
      }

      console.log(`[getProductsByCategory] ✅ Found ${productIds.length} products allocated to ${categoryPath}`);

      // Fetch all allocated products from Shopify in batches
      // Shopify has a query length limit (~8KB), so we batch requests
      const BATCH_SIZE = 100; // Fetch 100 products at a time (safe query size)
      const PARALLEL_BATCHES = 5; // Fetch 5 batches in parallel for speed
      
      console.log(`[getProductsByCategory] 📥 Fetching ${productIds.length} products from Shopify in ${Math.ceil(productIds.length / BATCH_SIZE)} batches (${PARALLEL_BATCHES} parallel)...`);
      
      // Split into batches
      const batches: string[][] = [];
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        batches.push(productIds.slice(i, i + BATCH_SIZE));
      }
      
      // Fetch batches in parallel groups using GraphQL aliases
      // The Storefront API doesn't support id: filtering in the products query,
      // so we use the product(id:) query with aliases to fetch multiple products at once
      allProducts = [];
      for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
        const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
        
        const results = await Promise.all(
          parallelBatches.map(async (batchIds, batchIndex) => {
            // Build a query with aliases for each product ID
            const aliases = batchIds.map((id, idx) => {
              const alias = `product_${idx}`;
              return `${alias}: product(id: "${id}") {
                id
                handle
                title
                availableForSale
                createdAt
                productType
                vendor
                tags
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                compareAtPriceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      availableForSale
                      selectedOptions {
                        name
                        value
                      }
                      price {
                        amount
                        currencyCode
                      }
                      compareAtPrice {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }`;
            }).join('\n');
            
            const query = `query GetProductsByIds { ${aliases} }`;
            
            const data = await shopifyFetch<Record<string, ShopifyProduct | null>>({
              query,
              variables: {},
              cache: 'force-cache',
            });
            
            // Extract products from aliased response
            const products: ProductWithPrimaryCollection[] = [];
            Object.values(data).forEach(product => {
              if (product && product.id) {
                products.push(product as ProductWithPrimaryCollection);
              }
            });
            
            return products;
          })
        );
        
        // Flatten results
        results.forEach(batch => allProducts.push(...batch));
        
        console.log(`[getProductsByCategory] Progress: ${Math.min((i + PARALLEL_BATCHES) * BATCH_SIZE, productIds.length)}/${productIds.length} products fetched`);
      }

      console.log(`[getProductsByCategory] ✅ Fetched ${allProducts.length} products from Shopify`);
      
      // Cache the results
      productsByCategoryCache.set(categoryPath, {
        products: allProducts,
        timestamp: now
      });
    }

    const beforeVendorFilter = allProducts.length;
    allProducts = filterExcludedFrontendVendors(allProducts);
    if (allProducts.length !== beforeVendorFilter) {
      console.log(`[getProductsByCategory] 🚫 Vendor exclusion applied: ${beforeVendorFilter} → ${allProducts.length} products`);
    }
    const beforePublishFilter = allProducts.length;
    allProducts = await filterPublishedForHeadless(allProducts);
    if (allProducts.length !== beforePublishFilter) {
      console.log(`[getProductsByCategory] 👁️ Visibility filter applied: ${beforePublishFilter} → ${allProducts.length} products`);
    }
    const beforeImageFilter = allProducts.length;
    allProducts = filterProductsWithImages(allProducts);
    if (allProducts.length !== beforeImageFilter) {
      console.log(`[getProductsByCategory] 🖼️ Image filter applied: ${beforeImageFilter} → ${allProducts.length} products`);
    }

    // Apply filters
    if (filters) {
      if (filters.brands && filters.brands.length > 0) {
        // Brand filter on the Shopify-path fallback uses canonical
        // `products.brand` from Postgres (looked up by handle) rather than the
        // Shopify `vendor` field, so it matches what category and brand pages
        // resolve to via the DB-first path.
        const handles = allProducts.map((p) => p.handle);
        const brandLower = filters.brands.map((b) => b.toLowerCase());
        try {
          const { sql } = await import('@/lib/db/client');
          const rows = (await sql`
            SELECT handle, LOWER(TRIM(COALESCE(brand, ''))) AS brand_lower
            FROM products
            WHERE handle = ANY(${handles})
          `) as unknown as Array<{ handle: string; brand_lower: string }>;
          const matchHandles = new Set(
            rows.filter((r) => r.brand_lower && brandLower.includes(r.brand_lower)).map((r) => r.handle)
          );
          allProducts = allProducts.filter((p) => matchHandles.has(p.handle));
        } catch (e) {
          console.error('[getProductsByCategory] brand filter DB lookup failed:', e);
          allProducts = [];
        }
      }

      if (filters.sizes && filters.sizes.length > 0) {
        allProducts = allProducts.filter(p =>
          p.variants.edges.some(({ node: variant }) =>
            variant.selectedOptions.some(opt =>
              opt.name.toLowerCase() === 'size' &&
              filters.sizes!.includes(opt.value)
            )
          )
        );
      }

      if (filters.colors && filters.colors.length > 0) {
        allProducts = allProducts.filter(p =>
          p.variants.edges.some(({ node: variant }) =>
            variant.selectedOptions.some(opt =>
              (opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour') &&
              filters.colors!.some(filterColor =>
                normalizeColor(opt.value) === normalizeColor(filterColor)
              )
            )
          )
        );
      }
    }

    // Calculate facets from filtered products
    const brandCounts = new Map<string, { count: number; displayName: string }>();
    const sizeCounts = new Map<string, number>();
    const colorCounts = new Map<string, { count: number; originalValue: string }>();
    let minPrice = Infinity;
    let maxPrice = 0;

    // Brand facet derives from canonical `products.brand` (DB), not Shopify
    // vendor or `brand:` tags. Mirrors the DB-first path so the on-sale
    // Shopify fallback returns the same brand options users see elsewhere.
    try {
      const handles = allProducts.map((p) => p.handle);
      if (handles.length > 0) {
        const { sql } = await import('@/lib/db/client');
        const rows = (await sql`
          SELECT TRIM(brand) AS brand
          FROM products
          WHERE handle = ANY(${handles})
            AND COALESCE(TRIM(brand), '') <> ''
        `) as unknown as Array<{ brand: string }>;
        for (const row of rows) {
          const display = row.brand;
          const key = display.toLowerCase();
          const existing = brandCounts.get(key);
          if (existing) existing.count++;
          else brandCounts.set(key, { count: 1, displayName: display });
        }
      }
    } catch (e) {
      console.error('[getProductsByCategory] brand facet DB lookup failed:', e);
    }

    allProducts.forEach(p => {
      
      // Prices
      const pMin = parseFloat(p.priceRange.minVariantPrice.amount);
      const pMax = parseFloat(p.priceRange.maxVariantPrice.amount);
      if (pMin < minPrice) minPrice = pMin;
      if (pMax > maxPrice) maxPrice = pMax;
      
      // Variants (Size & Color)
      p.variants.edges.forEach(({ node: variant }) => {
        const sizeOption = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size'
        );
        if (sizeOption && !isColorValue(sizeOption.value)) {
          const count = sizeCounts.get(sizeOption.value) || 0;
          sizeCounts.set(sizeOption.value, count + 1);
        }
        
        const colorOption = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color'
        );
        if (colorOption) {
          const normalizedValue = normalizeColor(colorOption.value);
          const existing = colorCounts.get(normalizedValue);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(normalizedValue, {
              count: 1,
              originalValue: colorOption.value
            });
          }
        }
      });
    });

    const brandFacets = Array.from(brandCounts.entries())
      .map(([value, { count, displayName }]) => ({ value, count, displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
      
    const sizeFacets = Array.from(sizeCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        const aNum = parseFloat(a.value);
        const bNum = parseFloat(b.value);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.value.localeCompare(b.value);
      });
      
    const colorFacets = Array.from(colorCounts.entries())
      .map(([value, { count, originalValue }]) => ({ value, count, originalValue }))
      .sort((a, b) => a.originalValue.localeCompare(b.originalValue));
      
    const priceFacet = {
      min: minPrice === Infinity ? 0 : Math.floor(minPrice / 10) * 10,
      max: maxPrice === 0 ? 500 : Math.ceil(maxPrice / 10) * 10
    };

    const facets = {
      brands: brandFacets,
      sizes: sizeFacets,
      colors: colorFacets,
      price: priceFacet
    };

    // Server-side sorting (before pagination) so /?sort=on-sale surfaces on-sale products on page 1.
    allProducts.sort((a, b) => {
      const aInStock = a.variants.edges.some(({ node }) => node.availableForSale);
      const bInStock = b.variants.edges.some(({ node }) => node.availableForSale);
      const aPrice = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
      const bPrice = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
      const aCompare = parseFloat(a.compareAtPriceRange?.minVariantPrice?.amount || '0');
      const bCompare = parseFloat(b.compareAtPriceRange?.minVariantPrice?.amount || '0');
      const aOnSale = aCompare > aPrice;
      const bOnSale = bCompare > bPrice;
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();

      switch (sortBy) {
        case 'on-sale':
          if (aOnSale !== bOnSale) return aOnSale ? -1 : 1;
          if (aInStock !== bInStock) return aInStock ? -1 : 1;
          return 0;
        case 'newest':
          if (aInStock !== bInStock) return aInStock ? -1 : 1;
          return bCreated - aCreated;
        case 'oldest':
          if (aInStock !== bInStock) return aInStock ? -1 : 1;
          return aCreated - bCreated;
        case 'price-asc':
          if (aInStock !== bInStock) return aInStock ? -1 : 1;
          return aPrice - bPrice;
        case 'price-desc':
          if (aInStock !== bInStock) return aInStock ? -1 : 1;
          return bPrice - aPrice;
        case 'featured':
        default:
          if (aInStock !== bInStock) return aInStock ? -1 : 1;
          return 0;
      }
    });

    // Implement pagination
    const totalCount = allProducts.length;
    let startIndex = 0;

    if (after) {
      // Find the index of the product after the cursor
      const cursorIndex = allProducts.findIndex(p => p.id === after);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedProducts = allProducts.slice(startIndex, startIndex + limit);
    const hasNextPage = startIndex + limit < totalCount;
    const endCursor = paginatedProducts.length > 0 
      ? paginatedProducts[paginatedProducts.length - 1].id 
      : null;

    return {
      products: paginatedProducts,
      pageInfo: { hasNextPage, endCursor },
      totalCount,
      facets
    };

  } catch (error) {
    console.error('[getProductsByCategory] Error fetching products for', categoryPath, ':', error);
    // Re-throw the error so we can see it in logs instead of silently returning empty
    throw error;
  }
}

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
