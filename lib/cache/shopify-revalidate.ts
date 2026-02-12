import { revalidatePath, revalidateTag } from 'next/cache';

interface ShopifyRevalidateOptions {
  extraPaths?: string[];
  extraTags?: string[];
}

/**
 * Invalidate storefront caches when Shopify product records change.
 * We use broad-but-safe invalidation here because webhooks do not always include
 * every affected route path.
 */
export function revalidateShopifyProductCaches(
  productHandle?: string | null,
  options: ShopifyRevalidateOptions = {}
): void {
  const extraPaths = (options.extraPaths || []).filter(
    (path): path is string => typeof path === 'string' && path.startsWith('/')
  );
  const extraTags = (options.extraTags || []).filter(
    (tag): tag is string => typeof tag === 'string' && tag.trim().length > 0
  );

  if (productHandle) {
    revalidateTag(`product-${productHandle}`, 'max');
    revalidatePath(`/products/${productHandle}`);
  }

  // Shared tags used by search endpoints/components.
  revalidateTag('search', 'max');

  // Common high-impact pages that frequently surface changed products.
  revalidatePath('/');
  revalidatePath('/on-sale');
  revalidatePath('/search');

  // Collection data tag used by on-sale collection fetches.
  revalidateTag('collection-on-sale', 'max');

  for (const path of extraPaths) {
    revalidatePath(path);
  }
  for (const tag of extraTags) {
    revalidateTag(tag, 'max');
  }
}
