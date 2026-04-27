import { revalidatePath, revalidateTag } from 'next/cache';
import { CATEGORY_PRODUCT_LISTINGS_CACHE_TAG } from '@/lib/config/collection-cache';
import { PRODUCT_OVERRIDES_CACHE_TAG } from '@/lib/content/product-overrides';
import { sql } from '@/lib/db/client';

interface ShopifyRevalidateOptions {
  extraPaths?: string[];
  extraTags?: string[];
}

/**
 * Trigger a background request to force page regeneration
 * This ensures the page is rebuilt immediately after revalidation
 */
async function triggerPageRebuild(path: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (!baseUrl) return;
  
  const url = `${baseUrl}${path}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'SEO-Enrichment-Revalidator',
      'x-prerender-revalidate': process.env.INTERNAL_REVALIDATE_SECRET || '',
    },
  });
  if (!response.ok) {
    console.warn(
      `[shopify-revalidate] rebuild request failed for ${path}: ${response.status}`
    );
  }
}

async function getCanonicalPathForHandle(productHandle: string): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT canonical_path
      FROM product_category_assignments
      WHERE product_handle = ${productHandle}
      LIMIT 1
    `;
    const rawPath =
      Array.isArray(rows) && rows.length > 0
        ? String((rows[0] as { canonical_path?: string }).canonical_path || '')
        : '';
    if (!rawPath) return null;
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  } catch (error) {
    console.warn('[shopify-revalidate] canonical path lookup failed', error);
    return null;
  }
}

/**
 * Invalidate storefront caches when Shopify product records change.
 * We use broad-but-safe invalidation here because webhooks do not always include
 * every affected route path.
 */
export async function revalidateShopifyProductCaches(
  productHandle?: string | null,
  options: ShopifyRevalidateOptions = {}
): Promise<void> {
  const extraPaths = new Set(
    (options.extraPaths || []).filter(
    (path): path is string => typeof path === 'string' && path.startsWith('/')
    )
  );
  const extraTags = (options.extraTags || []).filter(
    (tag): tag is string => typeof tag === 'string' && tag.trim().length > 0
  );

  if (productHandle) {
    revalidateTag(`product-${productHandle}`, 'max');
    extraPaths.add(`/products/${productHandle}`);
    const canonicalPath = await getCanonicalPathForHandle(productHandle);
    if (canonicalPath) {
      extraPaths.add(canonicalPath);
    }
  }

  // Shared tags used by search endpoints/components.
  revalidateTag('search', 'max');

  revalidateTag(CATEGORY_PRODUCT_LISTINGS_CACHE_TAG, 'max');
  revalidateTag(PRODUCT_OVERRIDES_CACHE_TAG, 'max');

  // Common high-impact pages that frequently surface changed products.
  revalidatePath('/');
  revalidatePath('/on-sale');
  revalidatePath('/search');

  // Collection data tag used by on-sale collection fetches.
  revalidateTag('collection-on-sale', 'max');

  for (const path of extraPaths) {
    revalidatePath(path);
    // Trigger immediate rebuild for product/canonical paths.
    void triggerPageRebuild(path).catch(() => {
      // Best effort only.
    });
  }
  for (const tag of extraTags) {
    revalidateTag(tag, 'max');
  }
}
