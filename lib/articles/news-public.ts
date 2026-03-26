/**
 * Published news articles for public /news routes (Neon `article` table).
 */

import { sql } from '@/lib/db/client';

let articleHeadlessColumnsExistCache: boolean | null = null;

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
}

async function getTagNamesForArticle(articleId: string): Promise<string[]> {
  const rows = await sql`
    SELECT t.name
    FROM public.article_tag_link atl
    JOIN public.article_tag t ON t.tag_id = atl.tag_id
    WHERE atl.article_id = ${articleId}
    ORDER BY t.name ASC
  `;
  const list = Array.isArray(rows) ? rows : [];
  return list.map((r) => String((r as { name: unknown }).name || '')).filter(Boolean);
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

/**
 * Full published article by URL slug (formerly Shopify article handle).
 */
export async function getPublishedNewsArticleBySlug(slug: string): Promise<NewsArticleDetail | null> {
  const hasHeadlessCols = await hasArticleHeadlessColumns();
  const rows = hasHeadlessCols
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

/**
 * Recent published articles for index, homepage, and “related” sidebar.
 */
export async function listPublishedNewsArticles(options: {
  limit: number;
  excludeArticleId?: string;
}): Promise<NewsArticleListItem[]> {
  const { limit, excludeArticleId } = options;

  const rows = excludeArticleId
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
        LIMIT ${limit}
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
        LIMIT ${limit}
      `;

  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => rowToListItem(row as Record<string, unknown>));
}

/**
 * Published articles by author name (matches AuthorBox slug → name convention).
 */
export async function listPublishedNewsArticlesByAuthorName(
  authorName: string
): Promise<NewsArticleListItem[]> {
  const normalized = authorName.trim();
  if (!normalized) return [];

  const rows = await sql`
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

  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => rowToListItem(row as Record<string, unknown>));
}
