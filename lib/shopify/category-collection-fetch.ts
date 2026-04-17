import { unstable_cache } from 'next/cache';
import {
  CATEGORY_PAGE_REVALIDATE_SECONDS,
  CATEGORY_PRODUCT_LISTINGS_CACHE_TAG,
} from '@/lib/config/collection-cache';
import { getProductsByCategory } from '@/lib/shopify/products';

type CategoryGridArgs = Parameters<typeof getProductsByCategory>;
const COLLECTION_GRID_CACHE_VERSION = 'v4';

/**
 * Collection pages: cache the heavy Neon + Shopify work in the Data Cache so ISR can be multi-day
 * while webhooks/admin still bust via CATEGORY_PRODUCT_LISTINGS_CACHE_TAG.
 */
export function getProductsByCategoryForCollectionPage(
  ...args: CategoryGridArgs
): ReturnType<typeof getProductsByCategory> {
  const [categoryPath, limit, after, filters, sortBy] = args;
  const cacheKey = [
    'collection-grid',
    COLLECTION_GRID_CACHE_VERSION,
    categoryPath,
    String(limit),
    after ?? 'null',
    JSON.stringify(filters ?? {}),
    sortBy ?? 'featured',
  ];

  return unstable_cache(
    async () => getProductsByCategory(...args),
    cacheKey,
    {
      revalidate: CATEGORY_PAGE_REVALIDATE_SECONDS,
      tags: [CATEGORY_PRODUCT_LISTINGS_CACHE_TAG],
    }
  )();
}
