import { shopifyFetch } from './client';
import { GET_COLLECTION_BY_HANDLE, GET_ALL_COLLECTIONS } from './queries';
import type { ShopifyCollection, CollectionWithParent } from '@/types/shopify';

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
 */
export async function getCollectionByHandle(
  handle: string,
  productsFirst: number = 50
): Promise<CollectionWithParent | null> {
  try {
    const data = await shopifyFetch<CollectionResponse>({
      query: GET_COLLECTION_BY_HANDLE,
      variables: { handle, first: productsFirst },
      tags: [`collection-${handle}`],
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




import type { ShopifyCollection, CollectionWithParent } from '@/types/shopify';

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
 */
