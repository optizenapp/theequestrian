/**
 * Get products filtered by collection and productType
 * Used for product type-based subcategory pages
 */

import { shopifyFetch } from './client';
import { normalizeProductType } from './collection-mapping';
import type { ShopifyProduct } from '@/types/shopify';

interface ProductsByTypeResponse {
  collection: {
    products: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
    };
  } | null;
}

const GET_PRODUCTS_BY_COLLECTION_AND_TYPE = `
  query GetProductsByCollectionAndType($handle: String!, $first: Int = 250) {
    collection(handle: $handle) {
      products(first: $first) {
        edges {
          node {
            id
            handle
            title
            productType
            availableForSale
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
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            tags
            metafield(namespace: "custom", key: "primary_collection") {
              value
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  }
`;

/**
 * Get products from a collection filtered by productType
 * 
 * @param collectionHandle - The parent collection handle (e.g., "footwear")
 * @param productType - The product type to filter by (e.g., "Riding Boots")
 * @returns Array of products matching the collection and productType
 */
export async function getProductsByCollectionAndType(
  collectionHandle: string,
  productType: string
): Promise<ShopifyProduct[]> {
  try {
    const data = await shopifyFetch<ProductsByTypeResponse>({
      query: GET_PRODUCTS_BY_COLLECTION_AND_TYPE,
      variables: { handle: collectionHandle, first: 250 },
    });

    if (!data.collection || !data.collection.products) {
      return [];
    }

    // Filter products by matching productType
    const normalizedTarget = normalizeProductType(productType);
    
    const products = data.collection.products.edges
      .map(({ node }) => node)
      .filter((product) => {
        if (!product.productType) return false;
        const normalizedProductType = normalizeProductType(product.productType);
        return normalizedProductType === normalizedTarget;
      });

    return products;
  } catch (error) {
    console.error('Error fetching products by type:', error);
    return [];
  }
}

/**
 * Convert a subcategory handle back to a product type for filtering
 * 
 * @param subcategoryHandle - URL-friendly subcategory handle (e.g., "riding-boots")
 * @returns Product type (e.g., "Riding Boots")
 */
export function subcategoryHandleToProductType(subcategoryHandle: string): string {
  // Convert URL-friendly handle back to title case
  return subcategoryHandle
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
