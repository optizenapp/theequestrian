/**
 * On-sale page: top-level category facet helpers.
 * Category is inferred from each product's canonical storefront URL.
 */

import type { ShopifyProduct } from '@/types/shopify';
import type { FilterOption } from '@/lib/filters/product-filters';

export const ON_SALE_TOP_CATEGORIES = [
  { handle: 'horse', label: 'Horse' },
  { handle: 'rider', label: 'Rider' },
  { handle: 'clothing', label: 'Clothing' },
  { handle: 'pet', label: 'Pet' },
  { handle: 'accessories', label: 'Accessories' },
] as const;

export type OnSaleTopCategoryHandle =
  (typeof ON_SALE_TOP_CATEGORIES)[number]['handle'];

const HANDLE_SET = new Set<string>(
  ON_SALE_TOP_CATEGORIES.map((c) => c.handle)
);

export function isOnSaleTopCategoryHandle(
  value: string | null | undefined
): value is OnSaleTopCategoryHandle {
  return Boolean(value && HANDLE_SET.has(value));
}

/** First path segment of a canonical URL, if it is a known top-level category. */
export function getTopLevelFromCanonicalUrl(
  url: string | undefined | null
): OnSaleTopCategoryHandle | null {
  if (!url) return null;
  const path = url.startsWith('http')
    ? (() => {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      })()
    : url;
  const segment = path.replace(/^\//, '').split('/')[0]?.toLowerCase();
  return isOnSaleTopCategoryHandle(segment) ? segment : null;
}

export function getOnSaleCategoryOptions(
  products: ShopifyProduct[],
  productUrls?: Record<string, string>
): FilterOption[] {
  if (!productUrls) return [];

  const counts = new Map<OnSaleTopCategoryHandle, number>();
  for (const product of products) {
    const top = getTopLevelFromCanonicalUrl(productUrls[product.id]);
    if (!top) continue;
    counts.set(top, (counts.get(top) || 0) + 1);
  }

  return ON_SALE_TOP_CATEGORIES.filter((c) => (counts.get(c.handle) || 0) > 0).map(
    (c) => ({
      value: c.handle,
      label: c.label,
      count: counts.get(c.handle) || 0,
    })
  );
}

export function filterByOnSaleCategory(
  products: ShopifyProduct[],
  saleCategory: string | undefined,
  productUrls?: Record<string, string>
): ShopifyProduct[] {
  if (!saleCategory || !isOnSaleTopCategoryHandle(saleCategory) || !productUrls) {
    return products;
  }

  return products.filter(
    (product) =>
      getTopLevelFromCanonicalUrl(productUrls[product.id]) === saleCategory
  );
}
