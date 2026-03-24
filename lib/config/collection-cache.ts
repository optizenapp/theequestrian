const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function envMs(raw: string | undefined, fallbackMs: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 60_000 ? n : fallbackMs;
}

/**
 * Neon: product id/handle lists per category_path (in-process).
 * Env: CATEGORY_ALLOC_CACHE_MS
 */
export const CATEGORY_ALLOC_CACHE_MS = envMs(
  process.env.CATEGORY_ALLOC_CACHE_MS,
  TWO_DAYS_MS
);

/**
 * In-process cache for the full Shopify payload built after allocation lookup.
 * Env: CATEGORY_PRODUCTS_CACHE_MS
 */
export const CATEGORY_PRODUCTS_CACHE_MS = envMs(
  process.env.CATEGORY_PRODUCTS_CACHE_MS,
  TWO_DAYS_MS
);

/**
 * Data cache TTL for collection grid (matches route `revalidate` in seconds; use a numeric literal in page files — Next 16 rejects `48 * 60 * 60` there).
 */
export const CATEGORY_PAGE_REVALIDATE_SECONDS = 172800;

/** unstable_cache + webhook/admin invalidation */
export const CATEGORY_PRODUCT_LISTINGS_CACHE_TAG = 'category-product-listings' as const;
