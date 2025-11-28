import { shopifyFetch } from './client';
import { GET_PRODUCT_BY_HANDLE, GET_ALL_PRODUCTS } from './queries';
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
    };
  };
}

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
 * Get all products (with pagination support)
 */
export async function getAllProducts(): Promise<ProductWithPrimaryCollection[]> {
  try {
    const data = await shopifyFetch<ProductsResponse>({
      query: GET_ALL_PRODUCTS,
      variables: { first: 250 },
    });

    return data.products.edges.map(({ node }) => node as ProductWithPrimaryCollection);
  } catch (error) {
    console.error('Error fetching all products:', error);
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
