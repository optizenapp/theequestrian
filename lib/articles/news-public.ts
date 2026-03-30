/**
 * Published news articles for public /news routes (Neon `article` table).
 */

import { unstable_cache, revalidateTag } from 'next/cache';
import { sql } from '@/lib/db/client';

let articleHeadlessColumnsExistCache: boolean | null = null;
const NEWS_CACHE_TTL_SECONDS = 5 * 60;
export const NEWS_ARTICLES_CACHE_TAG = 'news-articles';

function isMissingRelationError(error: unknown, relation: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const message = String(e.message || '').toLowerCase();
  return e.code === '42P01' && message.includes(`relation "${relation.toLowerCase()}" does not exist`);
}

export type NewsArticleListItem = {
  article_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  author_name: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
};

export type NewsArticleDetail = NewsArticleListItem & {
  content: string;
  updated_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  headless_cta_path: string | null;
  headless_cta_label: string | null;
  headless_related_handles: string | null;
  tag_names: string[];
};

async function hasArticleHeadlessColumns(): Promise<boolean> {
  if (articleHeadlessColumnsExistCache != null) {
    return articleHeadlessColumnsExistCache;
  }

  try {
    const rows = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'article'
        AND column_name IN ('headless_cta_path', 'headless_cta_label', 'headless_related_handles')
    `;
    const count = Array.isArray(rows) ? rows.length : 0;
    articleHeadlessColumnsExistCache = count === 3;
    return articleHeadlessColumnsExistCache;
  } catch {
    articleHeadlessColumnsExistCache = false;
    return false;
  }
}

async function getTagNamesForArticle(articleId: string): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT t.name
      FROM public.article_tag_link atl
      JOIN public.article_tag t ON t.tag_id = atl.tag_id
      WHERE atl.article_id = ${articleId}
      ORDER BY t.name ASC
    `;
    const list = Array.isArray(rows) ? rows : [];
    return list.map((r) => String((r as { name: unknown }).name || '')).filter(Boolean);
  } catch (error) {
    if (
      isMissingRelationError(error, 'public.article_tag_link') ||
      isMissingRelationError(error, 'public.article_tag')
    ) {
      return [];
    }
    throw error;
  }
}

function rowToListItem(row: Record<string, unknown>): NewsArticleListItem {
  const pub = row.published_at;
  return {
    article_id: String(row.article_id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    published_at:
      pub instanceof Date
        ? pub.toISOString()
        : pub != null
          ? String(pub)
          : null,
    author_name: row.author_name != null ? String(row.author_name) : null,
    featured_image_url: row.featured_image_url != null ? String(row.featured_image_url) : null,
    featured_image_alt: row.featured_image_alt != null ? String(row.featured_image_alt) : null,
  };
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 20;
  return Math.min(Math.floor(limit), 100);
}

/**
 * Full published article by URL slug (formerly Shopify article handle).
 */
async function fetchPublishedNewsArticleBySlug(slug: string): Promise<NewsArticleDetail | null> {
  const hasHeadlessCols = await hasArticleHeadlessColumns();
  let rows: unknown = [];
  try {
    rows = hasHeadlessCols
      ? await sql`
        SELECT
          a.article_id,
          a.slug,
          a.title,
          a.excerpt,
          a.content,
          a.published_at,
          a.updated_at,
          a.author_name,
          a.meta_title,
          a.meta_description,
          a.featured_image_url,
          a.featured_image_alt,
          a.headless_cta_path,
          a.headless_cta_label,
          a.headless_related_handles
        FROM public.article a
        WHERE a.slug = ${slug}
          AND a.status IN ('published', 'publish')
        LIMIT 1
      `
      : await sql`
        SELECT
          a.article_id,
          a.slug,
          a.title,
          a.excerpt,
          a.content,
          a.published_at,
          a.updated_at,
          a.author_name,
          a.meta_title,
          a.meta_description,
          a.featured_image_url,
          a.featured_image_alt
        FROM public.article a
        WHERE a.slug = ${slug}
          AND a.status IN ('published', 'publish')
        LIMIT 1
      `;
  } catch (error) {
    if (isMissingRelationError(error, 'public.article')) {
      return null;
    }
    throw error;
  }
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  const r = row as Record<string, unknown>;
  const base = rowToListItem(r);
  const upd = r.updated_at;
  const tag_names = await getTagNamesForArticle(base.article_id);

  return {
    ...base,
    content: String(r.content ?? ''),
    updated_at:
      upd instanceof Date ? upd.toISOString() : upd != null ? String(upd) : null,
    meta_title: r.meta_title != null ? String(r.meta_title) : null,
    meta_description: r.meta_description != null ? String(r.meta_description) : null,
    headless_cta_path: r.headless_cta_path != null ? String(r.headless_cta_path) : null,
    headless_cta_label: r.headless_cta_label != null ? String(r.headless_cta_label) : null,
    headless_related_handles:
      r.headless_related_handles != null ? String(r.headless_related_handles) : null,
    tag_names,
  };
}

export async function getPublishedNewsArticleBySlug(slug: string): Promise<NewsArticleDetail | null> {
  if (!slug.trim()) return null;
  return unstable_cache(
    () => fetchPublishedNewsArticleBySlug(slug),
    ['news-detail-by-slug-v1', slug],
    {
      revalidate: NEWS_CACHE_TTL_SECONDS,
      tags: [NEWS_ARTICLES_CACHE_TAG, `news-article-${slug}`],
    }
  )();
}

/**
 * Recent published articles for index, homepage, and “related” sidebar.
 */
async function fetchPublishedNewsArticles(options: {
  limit: number;
  excludeArticleId?: string;
}): Promise<NewsArticleListItem[]> {
  const { limit, excludeArticleId } = options;

  let rows: unknown = [];
  try {
    rows = excludeArticleId
      ? await sql`
        SELECT
          a.article_id,
          a.slug,
          a.title,
          a.excerpt,
          a.published_at,
          a.author_name,
          a.featured_image_url,
          a.featured_image_alt
        FROM public.article a
        WHERE a.status IN ('published', 'publish')
          AND a.article_id <> ${excludeArticleId}
        ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
        LIMIT ${normalizeLimit(limit)}
      `
      : await sql`
        SELECT
          a.article_id,
          a.slug,
          a.title,
          a.excerpt,
          a.published_at,
          a.author_name,
          a.featured_image_url,
          a.featured_image_alt
        FROM public.article a
        WHERE a.status IN ('published', 'publish')
        ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
        LIMIT ${normalizeLimit(limit)}
      `;
  } catch (error) {
    if (isMissingRelationError(error, 'public.article')) {
      return [];
    }
    throw error;
  }

  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => rowToListItem(row as Record<string, unknown>));
}

export async function listPublishedNewsArticles(options: {
  limit: number;
  excludeArticleId?: string;
}): Promise<NewsArticleListItem[]> {
  const normalizedLimit = normalizeLimit(options.limit);
  const excludeArticleId = options.excludeArticleId?.trim() || undefined;
  return unstable_cache(
    () => fetchPublishedNewsArticles({ limit: normalizedLimit, excludeArticleId }),
    ['news-list-v1', String(normalizedLimit), excludeArticleId || 'none'],
    { revalidate: NEWS_CACHE_TTL_SECONDS, tags: [NEWS_ARTICLES_CACHE_TAG] }
  )();
}

/**
 * Published articles by author name (matches AuthorBox slug → name convention).
 */
async function fetchPublishedNewsArticlesByAuthorName(
  authorName: string
): Promise<NewsArticleListItem[]> {
  const normalized = authorName.trim();
  if (!normalized) return [];

  let rows: unknown = [];
  try {
    rows = await sql`
      SELECT
        a.article_id,
        a.slug,
        a.title,
        a.excerpt,
        a.published_at,
        a.author_name,
        a.featured_image_url,
        a.featured_image_alt
      FROM public.article a
      WHERE a.status IN ('published', 'publish')
        AND LOWER(TRIM(a.author_name)) = LOWER(TRIM(${normalized}))
      ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
    `;
  } catch (error) {
    if (isMissingRelationError(error, 'public.article')) {
      return [];
    }
    throw error;
  }

  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => rowToListItem(row as Record<string, unknown>));
}

export async function listPublishedNewsArticlesByAuthorName(
  authorName: string
): Promise<NewsArticleListItem[]> {
  const normalized = authorName.trim();
  if (!normalized) return [];
  return unstable_cache(
    () => fetchPublishedNewsArticlesByAuthorName(normalized),
    ['news-list-by-author-v1', normalized.toLowerCase()],
    { revalidate: NEWS_CACHE_TTL_SECONDS, tags: [NEWS_ARTICLES_CACHE_TAG] }
  )();
}

/** All published articles for sitemap.xml / RSS (Neon only, no Shopify). */
export type NewsArticleSitemapEntry = {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  updated_at: string | null;
};

async function fetchAllPublishedNewsArticlesForSitemap(): Promise<NewsArticleSitemapEntry[]> {
  try {
    const rows = await sql`
      SELECT
        a.slug,
        a.title,
        a.excerpt,
        a.published_at,
        a.updated_at
      FROM public.article a
      WHERE a.status IN ('published', 'publish')
      ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
    `;
    const list = Array.isArray(rows) ? rows : [];
    return list.map((row) => {
      const r = row as Record<string, unknown>;
      const pub = r.published_at;
      const upd = r.updated_at;
      return {
        slug: String(r.slug),
        title: String(r.title),
        excerpt: r.excerpt != null ? String(r.excerpt) : null,
        published_at:
          pub instanceof Date ? pub.toISOString() : pub != null ? String(pub) : null,
        updated_at:
          upd instanceof Date ? upd.toISOString() : upd != null ? String(upd) : null,
      };
    });
  } catch (error) {
    if (isMissingRelationError(error, 'public.article')) {
      return [];
    }
    throw error;
  }
}

export async function listAllPublishedNewsArticlesForSitemap(): Promise<NewsArticleSitemapEntry[]> {
  return unstable_cache(
    () => fetchAllPublishedNewsArticlesForSitemap(),
    ['news-sitemap-all-db-v1'],
    { revalidate: 3600, tags: [NEWS_ARTICLES_CACHE_TAG] }
  )();
}

export function invalidateNewsArticlesCache(): void {
  try {
    revalidateTag(NEWS_ARTICLES_CACHE_TAG, 'max');
  } catch {
    // no-op outside Next request context
  }
}
