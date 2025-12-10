import { shopifyFetch } from './client';
import { GET_COLLECTION_BY_HANDLE, GET_ALL_COLLECTIONS } from './queries';
import type { ShopifyCollection, CollectionWithParent, ShopifyProduct } from '@/types/shopify';

interface CollectionResponse {
  collection: ShopifyCollection & {
    parentCollectionMetafield?: {
      value: string;
    } | null;
    pageContentMetafield?: {
      value: string;
    } | null;
    seoDescriptionMetafield?: {
      value: string;
    } | null;
    featuredLinksMetafield?: {
      value: string;
    } | null;
  };
}

interface CollectionsResponse {
  collections: {
    edges: Array<{
      node: ShopifyCollection;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

/**
 * Get a collection by its handle
 * Note: This function fetches a limited number of products and does NOT implement
 * global sorting by availability. For paginated collections with out-of-stock sorting,
 * use getCollectionWithPagination instead.
 */
export async function getCollectionByHandle(
  handle: string,
  productsFirst: number = 50
): Promise<CollectionWithParent | null> {
  try {
    const data = await shopifyFetch<CollectionResponse>({
      query: GET_COLLECTION_BY_HANDLE,
      variables: { handle, first: productsFirst },
      // tags: [`collection-${handle}`], // Removed tags as it's not in ShopifyFetchOptions
    });

    if (!data.collection) {
      return null;
    }

    // Extract metafields from aliased fields
    const collection = data.collection;
    
    const parentCollection = collection.parentCollectionMetafield?.value || null;
    const pageContent = collection.pageContentMetafield?.value || null;
    const seoDescription = collection.seoDescriptionMetafield?.value || null;
    const featuredLinksJson = collection.featuredLinksMetafield?.value || null;

    // Parse featured links JSON
    let featuredLinks: CollectionWithParent['featuredLinks'] = undefined;
    if (featuredLinksJson) {
      try {
        featuredLinks = JSON.parse(featuredLinksJson);
      } catch (e) {
        console.error('Error parsing featured links:', e);
      }
    }

    return {
      ...collection,
      parentCollection: parentCollection || undefined,
      pageContent: pageContent || undefined,
      seoDescription: seoDescription || undefined,
      featuredLinks: featuredLinks || undefined,
    };
  } catch (error) {
    console.error(`Error fetching collection ${handle}:`, error);
    return null;
  }
}

/**
 * Get a collection with paginated products, sorted with in-stock items first
 * This function fetches ALL products from the collection and then applies manual pagination
 * to ensure out-of-stock items appear at the end of the entire series, not just per page.
 */
export async function getCollectionWithPagination(
  handle: string,
  limit: number = 36,
  after?: string | null
): Promise<{
  collection: CollectionWithParent;
  products: ShopifyProduct[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}> {
  console.log(`[getCollectionWithPagination] Fetching collection: ${handle}, limit: ${limit}, after: ${after}`);

  // Fetch collection metadata
  const collectionData = await shopifyFetch<CollectionResponse>({
    query: GET_COLLECTION_BY_HANDLE,
    variables: { handle, first: 1 }, // Just get metadata, we'll fetch products separately
    cache: 'no-store',
  });

  if (!collectionData.collection) {
    throw new Error(`Collection ${handle} not found`);
  }

  // Extract metafields
  const collection = collectionData.collection;
  const parentCollection = collection.parentCollectionMetafield?.value || null;
  const pageContent = collection.pageContentMetafield?.value || null;
  const seoDescription = collection.seoDescriptionMetafield?.value || null;
  const featuredLinksJson = collection.featuredLinksMetafield?.value || null;

  let featuredLinks: CollectionWithParent['featuredLinks'] = undefined;
  if (featuredLinksJson) {
    try {
      featuredLinks = JSON.parse(featuredLinksJson);
    } catch (e) {
      console.error('Error parsing featured links:', e);
    }
  }

  const collectionWithMetadata: CollectionWithParent = {
    ...collection,
    parentCollection: parentCollection || undefined,
    pageContent: pageContent || undefined,
    seoDescription: seoDescription || undefined,
    featuredLinks: featuredLinks || undefined,
  };

  // Fetch ALL products from the collection
  const allProducts: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  const maxProducts = 250; // Safety limit

  while (hasNextPage && allProducts.length < maxProducts) {
    const paginationCursor = cursor; // Avoid circular type inference
    const data: CollectionResponse = await shopifyFetch<CollectionResponse>({
      query: GET_COLLECTION_BY_HANDLE,
      variables: { 
        handle, 
        first: 50,
        after: paginationCursor
      },
      cache: 'no-store',
    });

    if (!data.collection) break;

    const products = data.collection.products.edges.map((edge) => edge.node);
    allProducts.push(...products);

    hasNextPage = data.collection.products.pageInfo.hasNextPage;
    cursor = data.collection.products.pageInfo.endCursor || null;

    console.log(`[getCollectionWithPagination] Fetched ${products.length} products, total: ${allProducts.length}`);
  }

  console.log(`[getCollectionWithPagination] Total products fetched: ${allProducts.length}`);
  console.log('[getCollectionWithPagination] Products BEFORE sorting (first 5):', 
    allProducts.slice(0, 5).map(p => ({ title: p.title, availableForSale: p.availableForSale }))
  );

  // Sort: In-stock first, out-of-stock last
  allProducts.sort((a, b) => {
    if (a.availableForSale === b.availableForSale) return 0;
    return a.availableForSale ? -1 : 1;
  });

  console.log('[getCollectionWithPagination] Products AFTER sorting (first 5):', 
    allProducts.slice(0, 5).map(p => ({ title: p.title, availableForSale: p.availableForSale }))
  );

  // Handle pagination manually
  // Parse page number from cursor (format: "page:N")
  let page = 0;
  if (after) {
    const match = after.match(/^page:(\d+)$/);
    if (match) {
      page = parseInt(match[1]);
    }
  }

  const startIndex = page * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = allProducts.slice(startIndex, endIndex);
  const hasMore = endIndex < allProducts.length;

  console.log(`[getCollectionWithPagination] Page ${page}: Returning ${paginatedProducts.length} products (${startIndex}-${endIndex} of ${allProducts.length})`);
  console.log('[getCollectionWithPagination] Returned products availability:', 
    paginatedProducts.map(p => ({ title: p.title, availableForSale: p.availableForSale }))
  );

  return {
    collection: collectionWithMetadata,
    products: paginatedProducts,
    pageInfo: {
      hasNextPage: hasMore,
      endCursor: hasMore ? `page:${page + 1}` : null
    }
  };
}

/**
 * Get all collections (for sitemap, navigation, etc.)
 */
export async function getAllCollections(): Promise<CollectionWithParent[]> {
  try {
    const data = await shopifyFetch<CollectionsResponse>({
      query: GET_ALL_COLLECTIONS,
      variables: { first: 250 },
      cache: 'no-store',
    });

    return data.collections.edges.map(({ node }) => ({
      ...node,
      parentCollection: node.metafield?.value,
    }));
  } catch (error) {
    console.error('Error fetching all collections:', error);
    return [];
  }
}

/**
 * Build collection hierarchy map
 * Returns a map of parent collections to their children
 */
export async function getCollectionHierarchy(): Promise<
  Map<string, CollectionWithParent[]>
> {
  const collections = await getAllCollections();
  const hierarchy = new Map<string, CollectionWithParent[]>();

  // Group collections by parent
  collections.forEach((collection) => {
    const parent = collection.parentCollection || 'root';
    const children = hierarchy.get(parent) || [];
    children.push(collection);
    hierarchy.set(parent, children);
  });

  return hierarchy;
}

/**
 * Get top-level (parent) collections
 */
export async function getParentCollections(): Promise<CollectionWithParent[]> {
  const collections = await getAllCollections();
  return collections.filter((c) => !c.parentCollection);
}

/**
 * Get child collections for a parent
 */
export async function getChildCollections(
  parentHandle: string
): Promise<CollectionWithParent[]> {
  const collections = await getAllCollections();
  return collections.filter((c) => c.parentCollection === parentHandle);
}

/**
 * Get total product count for a collection
 * Note: Shopify Storefront API doesn't provide a direct count,
 * so we need to paginate through all products
 */
export async function getCollectionProductCount(handle: string): Promise<number> {
  try {
    let totalCount = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    const maxPages = 50; // Safety limit (50 pages * 250 products = 12,500 max)

    const COUNT_QUERY = `
      query GetCollectionProductCount($handle: String!, $first: Int!, $after: String) {
        collection(handle: $handle) {
          products(first: $first, after: $after) {
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
      }
    `;

    let pageCount = 0;
    while (hasNextPage && pageCount < maxPages) {
      type CountResponse = {
        collection: {
          products: {
            edges: Array<{ node: { id: string } }>;
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string | null;
            };
          };
        };
      };
      const paginationCursor = cursor; // Avoid circular type inference
      const data: CountResponse = await shopifyFetch<CountResponse>({
        query: COUNT_QUERY,
        variables: { handle, first: 250, after: paginationCursor },
      });

      if (!data.collection) {
        break;
      }

      totalCount += data.collection.products.edges.length;
      hasNextPage = data.collection.products.pageInfo.hasNextPage;
      cursor = data.collection.products.pageInfo.endCursor;
      pageCount++;
    }

    return totalCount;
  } catch (error) {
    console.error(`Error counting products for collection ${handle}:`, error);
    return 0;
  }
}
