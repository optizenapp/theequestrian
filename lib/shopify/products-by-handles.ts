import { shopifyFetch } from './client';
import type { ShopifyProduct } from '@/types/shopify';

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
        }
        compareAtPriceRange {
          minVariantPrice {
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
        primaryCollection: metafield(namespace: "custom", key: "primary_collection") {
          value
        }
        reviewRating: metafield(namespace: "judgeme", key: "rating") {
          value
        }
        reviewCount: metafield(namespace: "judgeme", key: "reviews_count") {
          value
        }
      }
    }
  }
`;

/**
 * Fetch multiple products by their handles
 * @param handles - Array of product handles (e.g., ["product-1", "product-2"])
 * @returns Array of ShopifyProduct objects
 */
export async function getProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
  if (!handles.length) return [];

  try {
    // Convert handles to Shopify global IDs
    const ids = handles.map(handle => `gid://shopify/Product/${handle}`);
    
    const data = await shopifyFetch<{
      nodes: (ShopifyProduct | null)[];
    }>({
      query: PRODUCTS_BY_HANDLES_QUERY,
      variables: { handles: ids },
      cache: 'force-cache',
      tags: handles.map(h => `product-${h}`),
    });

    // Filter out nulls and return valid products
    return data.nodes.filter((node): node is ShopifyProduct => node !== null);
  } catch (error) {
    console.error('[getProductsByHandles] Error fetching products:', error);
    return [];
  }
}

/**
 * Fetch products by handles using the Shopify REST-style query
 * This is more reliable for handle-based lookups
 */
export async function getProductsByHandlesAlt(handles: string[]): Promise<ShopifyProduct[]> {
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
              }
              compareAtPriceRange {
                minVariantPrice {
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
              primaryCollection: metafield(namespace: "custom", key: "primary_collection") {
                value
              }
              reviewRating: metafield(namespace: "judgeme", key: "rating") {
                value
              }
              reviewCount: metafield(namespace: "judgeme", key: "reviews_count") {
                value
              }
            }
          }
        `;

        const data = await shopifyFetch<{ product: ShopifyProduct | null }>({
          query,
          variables: { handle },
          cache: 'force-cache',
          tags: [`product-${handle}`],
        });

        return data.product;
      })
    );

    return products.filter((p): p is ShopifyProduct => p !== null);
  } catch (error) {
    console.error('[getProductsByHandlesAlt] Error fetching products:', error);
    return [];
  }
}
