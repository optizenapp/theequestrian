import { sql } from '@vercel/postgres';

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

/** DDL once per process — previously ran on every 60s cache refresh (66k+ times in Neon stats). */
let schemaPromise: Promise<void> | null = null;

async function ensureProductContentOverridesSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS product_content_overrides (
          id SERIAL PRIMARY KEY,
          product_id TEXT,
          product_handle TEXT NOT NULL UNIQUE,
          title_override TEXT,
          meta_title TEXT,
          meta_description TEXT,
          description_html TEXT,
          bullet_points JSONB DEFAULT '[]'::jsonb,
          slug_override TEXT,
          top_description_html TEXT,
          bottom_description_html TEXT,
          use_headless_title BOOLEAN DEFAULT false,
          use_headless_meta_title BOOLEAN DEFAULT false,
          use_headless_meta_description BOOLEAN DEFAULT false,
          use_headless_description BOOLEAN DEFAULT false,
          use_headless_bullets BOOLEAN DEFAULT false,
          use_headless_slug BOOLEAN DEFAULT false,
          use_headless_top_description BOOLEAN DEFAULT false,
          use_headless_bottom_description BOOLEAN DEFAULT false,
          is_published_headless BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS is_published_headless BOOLEAN NOT NULL DEFAULT true`;
    })();
  }
  try {
    await schemaPromise;
  } catch (e) {
    schemaPromise = null;
    throw e;
  }
}

export async function getProductOverrideByHandle(handle: string) {
  if (!handle) return null;
  await ensureProductContentOverridesSchema();
  const result = await sql`
    SELECT
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
    FROM product_content_overrides
    WHERE product_handle = ${handle}
    LIMIT 1
  `;
  return (result.rows[0] as ProductContentOverride) || null;
}

export async function getProductOverridesByHandles(handles: string[]) {
  const unique = [...new Set(handles.filter((h) => typeof h === 'string' && h.length > 0))];
  if (unique.length === 0) {
    return new Map<string, ProductContentOverride>();
  }
  await ensureProductContentOverridesSchema();
  const result = await sql`
    SELECT
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
    FROM product_content_overrides
    WHERE product_handle = ANY(${unique as any})
  `;
  const map = new Map<string, ProductContentOverride>();
  for (const row of result.rows) {
    const r = row as ProductContentOverride;
    map.set(r.product_handle, r);
  }
  return map;
}

export async function resolveProductHandleFromSlug(slug: string): Promise<string> {
  try {
    await ensureProductContentOverridesSchema();
    const result = await sql`
      SELECT product_handle
      FROM product_content_overrides
      WHERE slug_override = ${slug}
        AND use_headless_slug = true
      LIMIT 1
    `;
    return result.rows[0]?.product_handle || slug;
  } catch (error) {
    console.error('[Product Overrides] Error resolving slug:', error);
    return slug;
  }
}

/** No-op: overrides are no longer full-table cached. Kept for callers after writes. */
export function invalidateProductOverrideCache() {
  /* intentionally empty */
}
