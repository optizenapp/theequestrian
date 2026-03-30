/**
 * Central `revalidate` seconds for Next.js segment config and aligned data fetches.
 * Import these constants in `page.tsx` files so TTLs stay consistent (Next 16 segment
 * config requires static analyzable values; imported named constants are supported).
 *
 * Align Shopify `shopifyFetch` `next.revalidate` with SHOPIFY_GRAPHQL_FORCE_CACHE_REVALIDATE_SECONDS.
 */

/** Collection PLP / three-segment product shell (48h). */
export const CATEGORY_PAGE_REVALIDATE_SECONDS = 172800;

/** PDP and legacy catch-all product URLs. */
export const PRODUCT_PAGE_REVALIDATE_SECONDS = 300;

/** News index, article, author listing. */
export const NEWS_PAGE_REVALIDATE_SECONDS = 300;

/** Brand hub pages. */
export const BRAND_PAGE_REVALIDATE_SECONDS = 3600;

/** On-sale collection. */
export const ON_SALE_PAGE_REVALIDATE_SECONDS = 3600;

/** `shopifyFetch` when cache is `force-cache` + mapping `unstable_cache` TTL. */
export const SHOPIFY_GRAPHQL_FORCE_CACHE_REVALIDATE_SECONDS = 900;

/** Home page `unstable_cache` wrapper ([`lib/content/home-page-cached.ts`](lib/content/home-page-cached.ts)). */
export const HOME_DATA_CACHE_REVALIDATE_SECONDS = 300;

/** Static llms.txt route segment ISR. */
export const LLMS_TXT_REVALIDATE_SECONDS = 3600;
