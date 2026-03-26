import { sql } from '@vercel/postgres';
import { unstable_cache, revalidateTag } from 'next/cache';

export interface ProductContentOverride {
  product_handle: string;
  title_override: string | null;
  meta_title: string | null;
  meta_description: string | null;
  description_html: string | null;
  bullet_points: unknown[] | null;
  slug_override: string | null;
  top_description_html: string | null;
  bottom_description_html: string | null;
  use_headless_title: boolean | null;
  use_headless_meta_title: boolean | null;
  use_headless_meta_description: boolean | null;
  use_headless_description: boolean | null;
  use_headless_bullets: boolean | null;
  use_headless_slug: boolean | null;
  use_headless_top_description: boolean | null;
  use_headless_bottom_description: boolean | null;
  is_published_headless: boolean | null;
}

/**
 * Cache tag used to bust all product override reads after SEO enrichment or admin writes.
 * Call invalidateProductOverrideCache() from any write path.
 */
export const PRODUCT_OVERRIDES_CACHE_TAG = 'product-content-overrides';

/** TTL for the Data Cache entries — overrides rarely change outside enrichment runs. */
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h; busted on write via revalidateTag

const SELECT_COLUMNS = `
  product_handle,
  title_override,
  meta_title,
  meta_description,
  description_html,
  bullet_points,
  slug_override,
  top_description_html,
  bottom_description_html,
  use_headless_title,
  use_headless_meta_title,
  use_headless_meta_description,
  use_headless_description,
  use_headless_bullets,
  use_headless_slug,
  use_headless_top_description,
  use_headless_bottom_description,
  is_published_headless
`;

async function fetchOverrideByHandle(handle: string): Promise<ProductContentOverride | null> {
  const result = await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM product_content_overrides WHERE product_handle = $1 LIMIT 1`,
    [handle]
  );
  return (result.rows[0] as ProductContentOverride) || null;
}

async function fetchOverridesByHandles(handles: string[]): Promise<ProductContentOverride[]> {
  const result = await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM product_content_overrides WHERE product_handle = ANY($1)`,
    [handles]
  );
  return result.rows as ProductContentOverride[];
}

/**
 * Get a single product override, cached in Vercel Data Cache (shared across all serverless instances).
 * Cache is busted by invalidateProductOverrideCache() or revalidateTag(PRODUCT_OVERRIDES_CACHE_TAG).
 */
export async function getProductOverrideByHandle(handle: string) {
  if (!handle) return null;
  return unstable_cache(
    () => fetchOverrideByHandle(handle),
    ['product-override', handle],
    { tags: [PRODUCT_OVERRIDES_CACHE_TAG, `product-override-${handle}`], revalidate: CACHE_TTL_SECONDS }
  )();
}

/**
 * Get multiple product overrides in one query, cached in Vercel Data Cache.
 * Returns a Map keyed by product_handle.
 */
export async function getProductOverridesByHandles(handles: string[]) {
  const unique = [...new Set(handles.filter((h) => typeof h === 'string' && h.length > 0))];
  if (unique.length === 0) return new Map<string, ProductContentOverride>();

  const sorted = [...unique].sort(); // stable cache key regardless of call order
  const rows = await unstable_cache(
    () => fetchOverridesByHandles(sorted),
    ['product-overrides-batch', ...sorted],
    { tags: [PRODUCT_OVERRIDES_CACHE_TAG], revalidate: CACHE_TTL_SECONDS }
  )();

  const map = new Map<string, ProductContentOverride>();
  for (const row of rows) {
    map.set(row.product_handle, row);
  }
  return map;
}

export async function resolveProductHandleFromSlug(slug: string): Promise<string> {
  if (!slug) return slug;
  try {
    const resolved = await unstable_cache(
      async () => {
        const result = await sql`
          SELECT product_handle
          FROM product_content_overrides
          WHERE slug_override = ${slug}
            AND use_headless_slug = true
          LIMIT 1
        `;
        return result.rows[0]?.product_handle || null;
      },
      ['product-override-slug-lookup-v1', slug],
      {
        tags: [PRODUCT_OVERRIDES_CACHE_TAG, `product-override-slug-${slug}`],
        revalidate: CACHE_TTL_SECONDS,
      }
    )();
    return resolved || slug;
  } catch (error) {
    console.error('[Product Overrides] Error resolving slug:', error);
    return slug;
  }
}

/**
 * Bust the Data Cache for all product overrides.
 * Call this after any admin write or SEO enrichment write.
 */
export function invalidateProductOverrideCache() {
  try {
    revalidateTag(PRODUCT_OVERRIDES_CACHE_TAG, 'max');
  } catch {
    // revalidateTag throws outside a Next.js request context (e.g. from a script or test)
  }
}
