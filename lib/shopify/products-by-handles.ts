import { shopifyFetch } from './client';
import type { ShopifyProductCard } from '@/types/shopify';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';

const PRODUCTS_BY_HANDLES_QUERY = `
  query GetProductsByHandles($handles: [String!]!) {
    nodes(ids: $handles) {
      ... on Product {
        id
        handle
        title
        availableForSale
        vendor
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
    }
  }
`;

/**
 * Fetch multiple products by their handles
 * @param handles - Array of product handles (e.g., ["product-1", "product-2"])
 * @returns Array of ShopifyProduct objects with review stats
 */
export async function getProductsByHandles(handles: string[]): Promise<ShopifyProductCard[]> {
  if (!handles.length) return [];

  try {
    // Convert handles to Shopify global IDs
    const ids = handles.map(handle => `gid://shopify/Product/${handle}`);
    
    const data = await shopifyFetch<{
      nodes: (ShopifyProductCard | null)[];
    }>({
      query: PRODUCTS_BY_HANDLES_QUERY,
      variables: { handles: ids },
      cache: 'force-cache',
      tags: handles.map(h => `product-${h}`),
    });

    const products = data.nodes.filter((node): node is ShopifyProductCard => node !== null);

    // Fetch review stats for each product in parallel
    const productsWithReviews = await Promise.all(
      products.map(async (product) => {
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
    console.error('[getProductsByHandles] Error fetching products:', error);
    return [];
  }
}

/**
 * Fetch products by handles using the Shopify REST-style query
 * This is more reliable for handle-based lookups
 */
export async function getProductsByHandlesAlt(handles: string[]): Promise<ShopifyProductCard[]> {
  if (!handles.length) return [];

  try {
    const products = await Promise.all(
      handles.map(async (handle) => {
        const query = `
          query GetProduct($handle: String!) {
            product(handle: $handle) {
              id
              handle
              title
              availableForSale
              vendor
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
          }
        `;

        const data = await shopifyFetch<{ product: ShopifyProductCard | null }>({
          query,
          variables: { handle },
          cache: 'force-cache',
          tags: [`product-${handle}`],
        });

        if (!data.product) return null;

        // Fetch review stats from Postgres
        const stats = await getReviewStatsWithCache(data.product.handle);
        
        return {
          ...data.product,
          reviewRating: stats ? { value: stats.averageRating.toString() } : null,
          reviewCount: stats ? { value: stats.reviewCount.toString() } : null,
        };
      })
    );

    // Promise.all returns (ShopifyProductCardWithReviews | null)[]; filter out nulls then cast.
    return products.filter((p) => p !== null) as ShopifyProductCard[];
  } catch (error) {
    console.error('[getProductsByHandlesAlt] Error fetching products:', error);
    return [];
  }
}
