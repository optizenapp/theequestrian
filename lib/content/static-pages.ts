import { sql } from '@vercel/postgres';

export interface StaticPageContent {
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  intro_html: string | null;
  body_html: string | null;
  bottom_html: string | null;
  status: string | null;
}

let pageCache: Map<string, StaticPageContent> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 15 * 60 * 1000;

async function loadStaticPages(): Promise<Map<string, StaticPageContent>> {
  const now = Date.now();
  if (pageCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return pageCache;
  }

  try {
    const result = await sql.query(`
      SELECT 
        slug,
        title,
        meta_title,
        meta_description,
        intro_html,
        body_html,
        bottom_html,
        status
      FROM static_pages
      WHERE status = 'published'
      ORDER BY slug
    `);
    const map = new Map<string, StaticPageContent>();
    for (const row of result.rows) {
      map.set(row.slug, row as StaticPageContent);
    }
    pageCache = map;
    cacheTimestamp = now;
    return map;
  } catch (error) {
    console.error('[Static Pages] Error loading pages:', error);
    if (pageCache) return pageCache;
    return new Map();
  }
}

export async function getStaticPageContent(slug: string) {
  const pages = await loadStaticPages();
  return pages.get(slug) || null;
}

export function invalidateStaticPageCache() {
  pageCache = null;
  cacheTimestamp = null;
}
