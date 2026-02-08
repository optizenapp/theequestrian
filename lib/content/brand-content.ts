import { sql } from '@vercel/postgres';
import { getAllBrands, getBrandByHandle, type BrandMapping } from '@/lib/mapping/brand-mapping';

export interface BrandContentOverride {
  handle: string;
  title: string;
  h1_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  short_description: string | null;
  long_description: string | null;
  breadcrumb_label: string | null;
  faq_json: string | null;
  status: string | null;
}

let brandContentCache: Map<string, BrandContentOverride> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 15 * 60 * 1000;

async function loadBrandContent(): Promise<Map<string, BrandContentOverride>> {
  const now = Date.now();
  if (brandContentCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return brandContentCache;
  }

  try {
    const result = await sql.query(`
      SELECT
        handle,
        title,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        status
      FROM brand_content
      WHERE status = 'published'
      ORDER BY handle
    `);
    const map = new Map<string, BrandContentOverride>();
    for (const row of result.rows) {
      map.set(row.handle, row as BrandContentOverride);
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

export async function getBrandContentByHandle(handle: string): Promise<BrandMapping | null> {
  const base = getBrandByHandle(handle);
  if (!base) return null;
  const overrides = await loadBrandContent();
  const override = overrides.get(handle);
  if (!override) return base;
  return {
    ...base,
    title: override.title || base.title,
    h1_title: override.h1_title || base.h1_title,
    meta_title: override.meta_title || base.meta_title,
    meta_description: override.meta_description || base.meta_description,
    short_description: override.short_description || base.short_description,
    long_description: override.long_description || base.long_description,
    breadcrumb_label: override.breadcrumb_label || base.breadcrumb_label,
    faq_json: override.faq_json || base.faq_json,
  };
}

export async function listBrandsWithOverrides() {
  const brands = getAllBrands();
  const overrides = await loadBrandContent();
  return brands.map((brand) => {
    const override = overrides.get(brand.handle);
    return {
      handle: brand.handle,
      title: override?.title || brand.title,
      status: override?.status || 'missing',
      updated_at: null,
    };
  });
}

export function invalidateBrandContentCache() {
  brandContentCache = null;
  cacheTimestamp = null;
}
