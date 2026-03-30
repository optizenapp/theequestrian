import { unstable_cache, revalidateTag } from 'next/cache';
import { sql } from '@/lib/db/client';

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
const STATIC_PAGES_CACHE_TAG = 'static-pages';
const STATIC_PAGES_CACHE_REVALIDATE_SECONDS = 15 * 60;

async function fetchPublishedStaticPages(): Promise<StaticPageContent[]> {
  const result = await sql`
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
  `;
  return (Array.isArray(result) ? result : []) as StaticPageContent[];
}

const getCachedPublishedStaticPages =
  typeof process !== 'undefined' && process.env.NEXT_RUNTIME
    ? unstable_cache(fetchPublishedStaticPages, ['static-pages-published-v1'], {
        revalidate: STATIC_PAGES_CACHE_REVALIDATE_SECONDS,
        tags: [STATIC_PAGES_CACHE_TAG],
      })
    : fetchPublishedStaticPages;

async function loadStaticPages(): Promise<Map<string, StaticPageContent>> {
  const now = Date.now();
  if (pageCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return pageCache;
  }

  try {
    const result = await getCachedPublishedStaticPages();
    const map = new Map<string, StaticPageContent>();
    for (const row of result) {
      map.set(row.slug, row);
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
  try {
    revalidateTag(STATIC_PAGES_CACHE_TAG, 'max');
  } catch {
    // no-op outside Next request context
  }
}
