import { sql } from '@vercel/postgres';

export interface BrandContentRow {
  handle: string;
  title: string;
  products_count: number;
  h1_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  short_description: string | null;
  long_description: string | null;
  breadcrumb_label: string | null;
  faq_json: string | null;
  status: string | null;
  updated_at?: string | null;
}

let brandContentCache: Map<string, BrandContentRow> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 15 * 60 * 1000;

async function ensureBrandContentTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS brand_content (
      id SERIAL PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      products_count INTEGER DEFAULT 0,
      h1_title TEXT,
      meta_title TEXT,
      meta_description TEXT,
      short_description TEXT,
      long_description TEXT,
      breadcrumb_label TEXT,
      faq_json TEXT,
      status TEXT DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_handle ON brand_content(handle)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_status ON brand_content(status)`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS products_count INTEGER DEFAULT 0`;
}

async function loadBrandContent(): Promise<Map<string, BrandContentRow>> {
  const now = Date.now();
  if (brandContentCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return brandContentCache;
  }

  try {
    await ensureBrandContentTable();
    const result = await sql.query(`
      SELECT
        handle,
        title,
        COALESCE(products_count, 0) AS products_count,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        status,
        updated_at
      FROM brand_content
      WHERE status = 'published'
      ORDER BY handle
    `);
    const map = new Map<string, BrandContentRow>();
    for (const row of result.rows) {
      map.set(row.handle, row as BrandContentRow);
    }
    brandContentCache = map;
    cacheTimestamp = now;
    return map;
  } catch (error) {
    console.error('[Brand Content] Error loading overrides:', error);
    if (brandContentCache) return brandContentCache;
    return new Map();
  }
}

export async function getBrandContentByHandle(handle: string): Promise<BrandContentRow | null> {
  const overrides = await loadBrandContent();
  return overrides.get(handle) || null;
}

export async function getAllPublishedBrandContent(): Promise<BrandContentRow[]> {
  const contentMap = await loadBrandContent();
  return Array.from(contentMap.values());
}

export async function listBrandsWithOverrides() {
  await ensureBrandContentTable();
  const result = await sql.query(`
    SELECT
      handle,
      title,
      status,
      updated_at
    FROM brand_content
    ORDER BY handle
  `);
  return result.rows as Array<{
    handle: string;
    title: string;
    status: string;
    updated_at: string | null;
  }>;
}

export function invalidateBrandContentCache() {
  brandContentCache = null;
  cacheTimestamp = null;
}
