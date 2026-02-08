import { sql } from '@vercel/postgres';

export interface ProductContentOverride {
  product_handle: string;
  title_override: string | null;
  meta_title: string | null;
  meta_description: string | null;
  description_html: string | null;
  bullet_points: any[] | null;
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
}

let overrideCache: Map<string, ProductContentOverride> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 15 * 60 * 1000;

async function loadOverrides(): Promise<Map<string, ProductContentOverride>> {
  const now = Date.now();
  if (overrideCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return overrideCache;
  }

  try {
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const result = await sql.query(`
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
        use_headless_bottom_description
      FROM product_content_overrides
      ORDER BY product_handle
    `);
    const map = new Map<string, ProductContentOverride>();
    for (const row of result.rows) {
      map.set(row.product_handle, row as ProductContentOverride);
    }
    overrideCache = map;
    cacheTimestamp = now;
    return map;
  } catch (error) {
    console.error('[Product Overrides] Error loading overrides:', error);
    if (overrideCache) return overrideCache;
    return new Map();
  }
}

export async function getProductOverrideByHandle(handle: string) {
  const overrides = await loadOverrides();
  return overrides.get(handle) || null;
}

export async function getProductOverridesByHandles(handles: string[]) {
  const overrides = await loadOverrides();
  const map = new Map<string, ProductContentOverride>();
  for (const handle of handles) {
    const override = overrides.get(handle);
    if (override) {
      map.set(handle, override);
    }
  }
  return map;
}

export async function resolveProductHandleFromSlug(slug: string): Promise<string> {
  try {
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

export function invalidateProductOverrideCache() {
  overrideCache = null;
  cacheTimestamp = null;
}
