/**
 * Content Management for Collections
 * 
 * Reads content from Postgres database (collection_content table)
 * Handles H1s, SEO metadata, descriptions, and advanced features.
 * 
 * Features:
 * - In-memory caching for performance
 * - Automatic cache refresh every 15 minutes
 * - Fallback to CSV if database is unavailable
 */

import { sql } from '@/lib/db/client';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface RelatedCategory {
  url: string;
  title: string;
  description?: string;
}

export interface CollectionContent {
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  parent_url: string;
  category_level: number;
  status: string;
  default_sort: string;
  faq_items: FAQItem[];
  related_categories: RelatedCategory[];
}

// Cache for content
let contentCache: Map<string, CollectionContent> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = Number(process.env.COLLECTION_CONTENT_CACHE_TTL_MS || 60 * 1000); // default 60 seconds

/**
 * Load content from Postgres database with in-memory caching
 */
async function loadContent(): Promise<Map<string, CollectionContent>> {
  const now = Date.now();
  
  // Return cached content if still valid (15 min TTL)
  if (contentCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return contentCache;
  }

  try {
    // Query all published content from database
    const result = await sql`
      SELECT 
        url_path, h1_title, meta_title, meta_description,
        short_description, long_description, breadcrumb_label,
        parent_url, category_level, status, default_sort,
        faq_items, related_categories
      FROM collection_content
      WHERE status = 'published'
      ORDER BY url_path
    `;

    const contentMap = new Map<string, CollectionContent>();
    const rows = (Array.isArray(result) ? result : []) as Array<{
      url_path: string;
      h1_title: string;
      meta_title: string;
      meta_description: string;
      short_description: string;
      long_description: string;
      breadcrumb_label: string;
      parent_url: string;
      category_level: number;
      status: string;
      default_sort: string;
      faq_items: FAQItem[];
      related_categories: RelatedCategory[];
    }>;

    for (const row of rows) {
      contentMap.set(row.url_path, {
        url_path: row.url_path,
        h1_title: row.h1_title,
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        short_description: row.short_description || '',
        long_description: row.long_description || '',
        breadcrumb_label: row.breadcrumb_label,
        parent_url: row.parent_url,
        category_level: row.category_level,
        status: row.status,
        default_sort: row.default_sort || 'best-selling',
        faq_items: row.faq_items || [],
        related_categories: row.related_categories || [],
      });
    }

    // Update cache
    contentCache = contentMap;
    cacheTimestamp = now;
    
    console.log(`[Content Cache] Loaded ${contentMap.size} collection entries from Postgres`);
    
    return contentMap;
  } catch (error) {
    console.error('[Content] Error loading from database:', error);
    
    // Return cached content if available (even if expired)
    if (contentCache) {
      console.warn('[Content] Using stale cache due to database error');
      return contentCache;
    }
    
    // Last resort: return empty map
    return new Map();
  }
}

/**
 * Get content for a specific collection path
 */
export async function getCollectionContent(urlPath: string): Promise<CollectionContent | null> {
  const content = await loadContent();
  // Ensure path starts with /
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return content.get(normalizedPath) || null;
}

/**
 * Get content for a category/subcategory combination
 */
export async function getCategoryContent(
  category: string, 
  subcategory?: string, 
  subsubcategory?: string
): Promise<CollectionContent | null> {
  const parts = [category];
  if (subcategory) parts.push(subcategory);
  if (subsubcategory) parts.push(subsubcategory);
  
  const path = '/' + parts.join('/');
  return getCollectionContent(path);
}

export interface ParentCollectionLink {
  href: string;
  label: string;
}

/**
 * Resolves anchor text for mandatory parent internal linking (Next.js Link, not CMS HTML).
 * Uses parent row breadcrumb_label, then h1_title.
 */
export async function getParentCollectionLink(
  parentUrl: string | null | undefined
): Promise<ParentCollectionLink | null> {
  if (!parentUrl || parentUrl === '/') return null;
  const href = parentUrl.startsWith('/') ? parentUrl : `/${parentUrl}`;
  const parent = await getCollectionContent(href);
  const label =
    parent?.breadcrumb_label?.trim() ||
    parent?.h1_title?.trim() ||
    href
      .replace(/^\//, '')
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, ' ') ||
    'category';
  return { href, label };
}

export type CollectionNavRow = {
  path: string;
  label: string;
  parent_url: string;
  category_level: number;
};

/** Published catalog rows for silo nav — uses the same in-memory content cache. */
export async function getPublishedCollectionNav(): Promise<CollectionNavRow[]> {
  const content = await loadContent();
  const rows: CollectionNavRow[] = [];
  for (const row of content.values()) {
    const path = row.url_path.startsWith('/') ? row.url_path : `/${row.url_path}`;
    rows.push({
      path,
      label: (row.breadcrumb_label || row.h1_title || path).trim(),
      parent_url: row.parent_url || '',
      category_level: row.category_level,
    });
  }
  return rows;
}

/**
 * Check if a category exists in the database
 * Returns true if the category exists and is published
 */
export async function categoryExists(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Promise<boolean> {
  const content = await getCategoryContent(category, subcategory, subsubcategory);
  return content !== null && content.status === 'published';
}

/**
 * Invalidate cache (useful after content updates)
 */
export function invalidateCache(): void {
  contentCache = null;
  cacheTimestamp = null;
  console.log('[Content Cache] Invalidated');
}
