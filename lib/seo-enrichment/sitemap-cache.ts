import { sql } from '@vercel/postgres';
import { log } from '@/lib/seo-enrichment/logger';

export interface LinkablePageEntry {
  path: string;
  title: string;
  type: 'product' | 'collection' | 'static';
  category?: string;
  tags?: string[];
}

let cachedSitemap: LinkablePageEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Builds a site map of all linkable pages for internal linking suggestions.
 * Caches the result for 1 hour to avoid repeated DB queries.
 */
export async function getLinkableSitemap(): Promise<LinkablePageEntry[]> {
  const now = Date.now();
  if (cachedSitemap && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSitemap;
  }

  log('info', 'Building linkable sitemap cache...');

  const sitemap: LinkablePageEntry[] = [];

  try {
    // Fetch all products with their canonical paths
    const productsResult = await sql`
      SELECT DISTINCT
        pca.canonical_path as path,
        p.title,
        p.product_type as category,
        p.tags
      FROM products p
      LEFT JOIN product_category_assignments pca ON p.handle = pca.product_handle
      WHERE pca.canonical_path IS NOT NULL
      LIMIT 5000
    `;

    for (const row of productsResult.rows) {
      sitemap.push({
        path: String(row.path),
        title: String(row.title || ''),
        type: 'product',
        category: String(row.category || ''),
        tags: Array.isArray(row.tags) ? row.tags : [],
      });
    }

    // Fetch all collections
    const collectionsResult = await sql`
      SELECT
        url_path as path,
        h1_title as title,
        'collection' as type
      FROM collection_content
      WHERE url_path IS NOT NULL
      LIMIT 1000
    `;

    for (const row of collectionsResult.rows) {
      sitemap.push({
        path: String(row.path),
        title: String(row.title || row.path),
        type: 'collection',
      });
    }

    // Add static pages (manually curated for now)
    const staticPages: LinkablePageEntry[] = [
      { path: '/about', title: 'About Us', type: 'static' },
      { path: '/contact', title: 'Contact', type: 'static' },
      { path: '/shipping-delivery', title: 'Shipping & Delivery', type: 'static' },
      { path: '/returns-refunds', title: 'Returns & Refunds', type: 'static' },
      { path: '/horse', title: 'Horse Products', type: 'static' },
      { path: '/rider', title: 'Rider Products', type: 'static' },
      { path: '/clothing', title: 'Clothing', type: 'static' },
      { path: '/pet', title: 'Pet Products', type: 'static' },
      { path: '/accessories', title: 'Accessories', type: 'static' },
    ];

    sitemap.push(...staticPages);

    cachedSitemap = sitemap;
    cacheTimestamp = now;

    log('info', 'Sitemap cache built', { totalPages: sitemap.length });
    return sitemap;
  } catch (error) {
    log('error', 'Failed to build sitemap cache', { error: String(error) });
    return [];
  }
}

/**
 * Finds relevant pages for internal linking based on semantic similarity.
 * Uses simple keyword matching for now (can be enhanced with embeddings later).
 */
export function findRelevantPages(
  currentPath: string,
  currentTitle: string,
  currentCategory: string,
  currentTags: string[],
  sitemap: LinkablePageEntry[],
  maxResults = 8
): LinkablePageEntry[] {
  const currentKeywords = new Set([
    ...currentTitle.toLowerCase().split(/\s+/),
    ...currentCategory.toLowerCase().split(/\s+/),
    ...currentTags.map((t) => t.toLowerCase()),
  ]);

  const scored = sitemap
    .filter((page) => page.path !== currentPath) // Exclude self
    .map((page) => {
      let score = 0;

      // Keyword overlap in title
      const pageKeywords = page.title.toLowerCase().split(/\s+/);
      const overlap = pageKeywords.filter((kw) => currentKeywords.has(kw)).length;
      score += overlap * 10;

      // Same category
      if (page.category && page.category.toLowerCase() === currentCategory.toLowerCase()) {
        score += 20;
      }

      // Tag overlap
      if (page.tags) {
        const tagOverlap = page.tags.filter((tag) =>
          currentTags.some((ct) => ct.toLowerCase() === tag.toLowerCase())
        ).length;
        score += tagOverlap * 15;
      }

      // Boost collections (hub pages)
      if (page.type === 'collection') {
        score += 5;
      }

      // Path similarity (same parent category)
      const currentParts = currentPath.split('/').filter(Boolean);
      const pageParts = page.path.split('/').filter(Boolean);
      const pathOverlap = currentParts.filter((part) => pageParts.includes(part)).length;
      score += pathOverlap * 8;

      return { page, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((item) => item.page);
}

/**
 * Clears the sitemap cache (useful for testing or manual refresh).
 */
export function clearSitemapCache(): void {
  cachedSitemap = null;
  cacheTimestamp = 0;
  log('info', 'Sitemap cache cleared');
}
