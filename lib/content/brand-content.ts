import { sql } from '@/lib/db/client';
import { ensureBrandContentColumns } from '@/lib/db/ensure-brand-content-columns';
import { isBlockedBrandHandle, isBlockedBrandName } from '@/lib/brands/blocked-brands';

export interface BrandContentRow {
  handle: string;
  title: string;
  products_count: number;
  rules: string | null;
  h1_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  short_description: string | null;
  long_description: string | null;
  breadcrumb_label: string | null;
  faq_json: string | null;
  quick_answer: string | null;
  logo_url: string | null;
  sizing_html: string | null;
  sizing_source_url: string | null;
  sizing_updated_at: string | null;
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
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS rules TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS quick_answer TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS logo_url TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_html TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_source_url TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_updated_at TIMESTAMPTZ`;
}

async function loadBrandContent(): Promise<Map<string, BrandContentRow>> {
  const now = Date.now();
  if (brandContentCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return brandContentCache;
  }

  try {
    await ensureBrandContentColumns();
    const result = await sql`
      SELECT
        handle,
        title,
        COALESCE(products_count, 0) AS products_count,
        rules,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        quick_answer,
        logo_url,
        sizing_html,
        sizing_source_url,
        sizing_updated_at,
        status,
        updated_at
      FROM brand_content
      WHERE status = 'published'
      ORDER BY handle
    `;
    const rawRows = (Array.isArray(result) ? result : []) as Array<
      Partial<BrandContentRow> & Pick<BrandContentRow, 'handle' | 'title'>
    >;
    const map = new Map<string, BrandContentRow>();
    for (const row of rawRows) {
      if (isBlockedBrandHandle(row.handle)) continue;
      map.set(row.handle, {
        handle: row.handle,
        title: row.title,
        products_count: row.products_count ?? 0,
        rules: row.rules ?? null,
        h1_title: row.h1_title ?? null,
        meta_title: row.meta_title ?? null,
        meta_description: row.meta_description ?? null,
        short_description: row.short_description ?? null,
        long_description: row.long_description ?? null,
        breadcrumb_label: row.breadcrumb_label ?? null,
        faq_json: row.faq_json ?? null,
        quick_answer: row.quick_answer ?? null,
        logo_url: row.logo_url ?? null,
        sizing_html: row.sizing_html ?? null,
        sizing_source_url: row.sizing_source_url ?? null,
        sizing_updated_at: row.sizing_updated_at ?? null,
        status: row.status ?? null,
        updated_at: row.updated_at ?? null,
      });
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
  if (isBlockedBrandHandle(handle)) return null;
  const overrides = await loadBrandContent();
  return overrides.get(handle) || null;
}

export async function getAllPublishedBrandContent(): Promise<BrandContentRow[]> {
  const contentMap = await loadBrandContent();
  return Array.from(contentMap.values()).filter((row) => !isBlockedBrandHandle(row.handle));
}

/**
 * Short label for /brands index cards (not the long SEO `title`).
 * Uses `breadcrumb_label` when set; otherwise strips common "Shop …" prefixes and
 * truncates at subtitle separators (" - ", " | ") or before a trailing " Horse …" /
 * " … Equestrian …" phrase.
 */
export function getBrandIndexDisplayName(brand: BrandContentRow): string {
  const bc = brand.breadcrumb_label?.trim();
  if (bc) return bc;

  let s = brand.title.trim().replace(/^Shop\s+(?:&\s+Buy\s+)?/i, '');
  const dashIdx = s.indexOf(' - ');
  if (dashIdx !== -1) s = s.slice(0, dashIdx).trim();
  const pipeIdx = s.indexOf(' | ');
  if (pipeIdx !== -1) s = s.slice(0, pipeIdx).trim();

  const horsePhrase = s.match(/^(.+?)\s+Horse\s+/i);
  if (horsePhrase) s = horsePhrase[1].trim();

  const equestrianPhrase = s.match(/^(.+?)\s+Equestrian\s+/i);
  if (equestrianPhrase) s = equestrianPhrase[1].trim();

  return s || brand.title;
}

/**
 * Get allowed vendor names and tag values from published brands in the DB.
 * Used for the brand filter on category pages so only curated brands appear.
 * Parses the rules column (Shopify collection rule JSON) to extract VENDOR, BRAND, and TAG conditions.
 */
export async function getAllowedBrandVendorsFromDb(): Promise<{
  vendors: string[];
  tags: string[];
}> {
  const result = await sql`
    SELECT handle, rules FROM brand_content WHERE status = 'published' AND rules IS NOT NULL AND rules != ''
  `;
  const vendors: string[] = [];
  const tags: string[] = [];
  const seenV = new Set<string>();
  const seenT = new Set<string>();

  const rows = (Array.isArray(result) ? result : []) as Array<{ handle: string; rules: string | null }>;
  for (const row of rows) {
    if (isBlockedBrandHandle(row.handle)) continue;
    const rulesStr = row.rules;
    if (!rulesStr || rulesStr === 'Manual Collection') continue;
    try {
      const rules = JSON.parse(rulesStr) as Array<{ column?: string; condition?: string }>;
      if (!Array.isArray(rules)) continue;
      for (const rule of rules) {
        const col = rule.column?.toUpperCase();
        if (
          (col === 'VENDOR' || col === 'BRAND') &&
          rule.condition &&
          !isBlockedBrandName(rule.condition) &&
          !seenV.has(rule.condition.toLowerCase())
        ) {
          seenV.add(rule.condition.toLowerCase());
          vendors.push(rule.condition);
        } else if (rule.column === 'TAG' && rule.condition) {
          const lower = rule.condition.toLowerCase();
          if (!seenT.has(lower)) {
            seenT.add(lower);
            tags.push(lower);
          }
        }
      }
    } catch (e) {
      console.warn('[getAllowedBrandVendorsFromDb] Failed to parse rules for', row.handle, e);
    }
  }

  return { vendors, tags };
}

export async function listBrandsWithOverrides() {
  const result = await sql`
    SELECT
      handle,
      title,
      status,
      updated_at
    FROM brand_content
    ORDER BY handle
  `;
  const rows = (Array.isArray(result) ? result : []) as Array<{
    handle: string;
    title: string;
    status: string;
    updated_at: string | null;
  }>;
  return rows;
}

export function invalidateBrandContentCache() {
  brandContentCache = null;
  cacheTimestamp = null;
}
