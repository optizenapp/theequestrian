import { shopifyFetch } from './client';
import { shopifyAdminFetch } from './admin-client';
import { GET_PRODUCT_BY_HANDLE, GET_ALL_PRODUCTS, GET_PRODUCTS_BY_QUERY } from './queries';
import { normalizeColor, isColorValue } from '@/lib/utils/product-options';
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

    // --- FILTERING ALREADY DONE BY SHOPIFY ---
    // No need for in-memory filtering - Shopify's query already filtered by brand/size/color
    // The products we fetched are already the filtered results
    let filteredProducts = [...allProductsUnfiltered];
    
    console.log(`[getProductsByTypes] ✅ Using ${filteredProducts.length} products (pre-filtered by Shopify query)`);

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

    // 1. Try to fetch by product type for relevance
    if (productType) {
      console.log(`[getRecommendedProducts] Fetching related products for type: ${productType}`);
      const data = await shopifyFetch<ProductsResponse>({
        query: GET_PRODUCTS_BY_QUERY,
        variables: { 
          query: `product_type:"${productType}"`, 
          first: limit + 5 // Fetch extra to allow for exclusion
        },
      });
      
      if (data.products?.edges) {
        products = data.products.edges.map(({ node }) => node);
      }
    } 
    
    // 2. Fallback to "all products" (latest) if no type or no results found
    if (products.length === 0) {
      console.log(`[getRecommendedProducts] Fallback: Fetching latest products`);
    const data = await shopifyFetch<ProductsResponse>({
      query: GET_ALL_PRODUCTS,
        variables: { first: limit + 5 },
    });

      if (data.products?.edges) {
        products = data.products.edges.map(({ node }) => node);
      }
    }

    // Filter out the current product if handle provided
    if (excludeHandle) {
      products = products.filter(p => p.handle !== excludeHandle);
    }

    console.log(`[getRecommendedProducts] Found ${products.length} products (limit: ${limit})`);
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
    const scoredProducts: ScoredProduct[] = Array.from(candidateProducts.values()).map(product => {
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
export function getPrimaryCategoryPath(productType: string): string | null {
  if (!productType || !productType.trim()) {
    return null;
  }

  // Check module-level cache first (persists across requests)
  if (categoryPathCache.has(productType)) {
    return categoryPathCache.get(productType) || null;
  }

  // Use the same logic as getBreadcrumbsForProduct to find category paths
  const { getBreadcrumbsForProduct } = require('@/lib/mapping/collection-mapping');
  const breadcrumbPaths = getBreadcrumbsForProduct(productType);
  
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
 */
// Canonical URL only needs handle + productType (and optionally id for batching).
export function getProductCanonicalUrl(product: Pick<ShopifyProduct, 'handle' | 'productType'>): string {
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
export function getProductCanonicalUrls(
  products: Array<Pick<ShopifyProduct, 'id' | 'handle' | 'productType'>>
): Map<string, string> {
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
