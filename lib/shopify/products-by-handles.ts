import { shopifyFetch } from './client';
import { filterExcludedFrontendVendors } from './vendor-visibility';
import type { ShopifyProductCard } from '@/types/shopify';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';

/**
 * Fetch multiple products by their handles
 * @param handles - Array of product handles (e.g., ["product-1", "product-2"])
 * @returns Array of ShopifyProduct objects with review stats
 */
export async function getProductsByHandles(handles: string[]): Promise<ShopifyProductCard[]> {
  return getProductsByHandlesAlt(handles);
}

/**
 * Fetch products by handles using the Shopify REST-style query
 * This is more reliable for handle-based lookups
 */
export async function getProductsByHandlesAlt(handles: string[]): Promise<ShopifyProductCard[]> {
  if (!handles.length) return [];

  try {
    const normalizedHandles = handles
      .filter(Boolean)
      .map((handle) => handle.trim())
      .filter((handle) => handle.length > 0);

    const CHUNK_SIZE = 25;
    const fetchedProducts: ShopifyProductCard[] = [];

    for (let start = 0; start < normalizedHandles.length; start += CHUNK_SIZE) {
      const chunk = normalizedHandles.slice(start, start + CHUNK_SIZE);
      if (chunk.length === 0) continue;

      const aliases = chunk
        .map((handle, index) => {
          const escapedHandle = handle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return `
            p${index}: product(handle: "${escapedHandle}") {
              id
              handle
              title
              productType
              availableForSale
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
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                    width
                    height
                  }
                }
              }
              metafield(namespace: "custom", key: "primary_collection") {
                value
              }
            }
          `;
        })
        .join('\n');

      const query = `query GetProductsByHandlesChunk { ${aliases} }`;
      const data = await shopifyFetch<Record<string, ShopifyProductCard | null>>({
        query,
        cache: 'force-cache',
        tags: chunk.map((handle) => `product-${handle}`),
      });

      for (const product of Object.values(data)) {
        if (product) {
          fetchedProducts.push(product);
        }
      }
    }

    const visibleProducts = filterExcludedFrontendVendors(fetchedProducts);

    const orderedProducts = normalizedHandles
      .map((handle) => visibleProducts.find((product) => product.handle === handle))
      .filter((product): product is ShopifyProductCard => Boolean(product));

    const productsWithReviews = await Promise.all(
      orderedProducts.map(async (product) => {
        const stats = await getReviewStatsWithCache(product.handle);
        return {
          ...product,
          reviewRating: stats ? { value: stats.averageRating.toString() } : null,
          reviewCount: stats ? { value: stats.reviewCount.toString() } : null,
        };
      })
    );

    return productsWithReviews;
  } catch (error) {
    console.error('[getProductsByHandlesAlt] Error fetching products:', error);
    return [];
  }
}
