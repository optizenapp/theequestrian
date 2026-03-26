/**
 * Article system database queries using Neon raw SQL
 */

import { sql } from '@/lib/db/client';
import type { Article, ArticleCategory, ArticleWithRelations, Place } from './types';

type ArticleRow = {
  article_id: unknown;
  slug: unknown;
  title: unknown;
  excerpt: unknown;
  content: unknown;
  article_type: unknown;
  status: unknown;
  published_at: unknown;
  updated_at: unknown;
  author_id: unknown;
  author_name: unknown;
  author_bio: unknown;
  author_image_url: unknown;
  meta_title: unknown;
  meta_description: unknown;
  featured_image_url: unknown;
  featured_image_alt: unknown;
  exclude_from_place_hubs: unknown;
  primary_category_id: unknown;
  copiq_id: unknown;
  copiq_social_posts: unknown;
  pr_contacts: unknown;
  created_at: unknown;
  view_count: unknown;
  headless_cta_path: unknown;
  headless_cta_label: unknown;
  headless_related_handles: unknown;
  cat_id: unknown;
  cat_slug: unknown;
  cat_name: unknown;
};

type ArticlePlaceRow = {
  article_place_id: unknown;
  article_id: unknown;
  place_id: unknown;
  primary_place: unknown;
  p_place_id: unknown;
  p_slug: unknown;
  p_name: unknown;
  p_type: unknown;
};

export async function getArticleById(articleId: string): Promise<ArticleWithRelations | null> {
  const rows = await sql`
    SELECT
      a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
      a.published_at, a.updated_at, a.author_id, a.author_name, a.author_bio, a.author_image_url,
      a.meta_title, a.meta_description, a.featured_image_url, a.featured_image_alt,
      a.exclude_from_place_hubs, a.primary_category_id, a.copiq_id, a.copiq_social_posts, a.pr_contacts,
      a.created_at, a.view_count,
      a.headless_cta_path, a.headless_cta_label, a.headless_related_handles,
      c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
    FROM article a
    LEFT JOIN article_category c ON c.category_id = a.primary_category_id
    WHERE a.article_id = ${articleId}
    LIMIT 1
  `;
  const row = (Array.isArray(rows) ? rows[0] : null) as ArticleRow | null;
  if (!row) return null;

  const articlePlaces = await sql`
    SELECT ap.article_place_id, ap.article_id, ap.place_id, ap.primary_place,
           p.place_id AS p_place_id, p.slug AS p_slug, p.name AS p_name, p.type AS p_type
    FROM article_place ap
    JOIN place p ON p.place_id = ap.place_id
    WHERE ap.article_id = ${articleId}
  `;
  const places = (Array.isArray(articlePlaces) ? articlePlaces : []) as ArticlePlaceRow[];

  return {
    article_id: row.article_id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    article_type: row.article_type,
    status: row.status,
    published_at: row.published_at,
    updated_at: row.updated_at,
    author_id: row.author_id,
    author_name: row.author_name,
    author_bio: row.author_bio,
    author_image_url: row.author_image_url,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    featured_image_url: row.featured_image_url,
    featured_image_alt: row.featured_image_alt,
    exclude_from_place_hubs: row.exclude_from_place_hubs,
    primary_category_id: row.primary_category_id,
    copiq_id: row.copiq_id,
    copiq_social_posts: row.copiq_social_posts,
    pr_contacts: row.pr_contacts,
    created_at: row.created_at,
    view_count: row.view_count,
    headless_cta_path: row.headless_cta_path != null ? String(row.headless_cta_path) : null,
    headless_cta_label: row.headless_cta_label != null ? String(row.headless_cta_label) : null,
    headless_related_handles:
      row.headless_related_handles != null ? String(row.headless_related_handles) : null,
    article_category: row.cat_id
      ? {
          category_id: row.cat_id,
          slug: row.cat_slug,
          name: row.cat_name,
          description: null,
          parent_category_id: null,
          sort_order: null,
          created_at: null,
        }
      : null,
    article_place: places.map((p) => ({
      article_place_id: p.article_place_id,
      article_id: p.article_id,
      place_id: p.place_id,
      primary_place: p.primary_place,
      place: {
        place_id: p.p_place_id,
        slug: p.p_slug,
        name: p.p_name,
        type: p.p_type,
      },
    })),
  } as ArticleWithRelations;
}

export async function getArticleByCopiqId(copiqId: string): Promise<Article | null> {
  const rows = await sql`
    SELECT * FROM article WHERE copiq_id = ${copiqId} LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] : null;
  return (row as Article) || null;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const rows = await sql`
    SELECT * FROM article WHERE slug = ${slug} LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] : null;
  return (row as Article) || null;
}

export async function getCategories(): Promise<ArticleCategory[]> {
  const rows = await sql`
    SELECT category_id, slug, name, description, parent_category_id, sort_order, created_at
    FROM article_category
    ORDER BY name ASC
  `;
  return (Array.isArray(rows) ? rows : []) as ArticleCategory[];
}

export async function getCategoryBySlug(slug: string): Promise<ArticleCategory | null> {
  const rows = await sql`
    SELECT category_id, slug, name, description, parent_category_id, sort_order, created_at
    FROM article_category WHERE slug = ${slug} LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] : null;
  return (row as ArticleCategory) || null;
}

export async function getPlaces(options?: { types?: string[] }): Promise<Place[]> {
  const types = options?.types ?? ['city', 'town', 'village', 'suburb'];
  const rows = await sql`
    SELECT place_id, slug, name, type, description, parent_place_id
    FROM place
    WHERE type = ANY(${types})
    ORDER BY name ASC
  `;
  return (Array.isArray(rows) ? rows : []) as Place[];
}

export async function getRegions(): Promise<Place[]> {
  const rows = await sql`
    SELECT place_id, slug, name, type
    FROM place WHERE type = 'region'
    ORDER BY name ASC
  `;
  return (Array.isArray(rows) ? rows : []) as Place[];
}

export async function getPlaceAssociations(): Promise<{ parent_id: string; child_id: string }[]> {
  const rows = await sql`
    SELECT parent_id, child_id FROM place_association
  `;
  return (Array.isArray(rows) ? rows : []) as { parent_id: string; child_id: string }[];
}

export async function listArticles(options: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ articles: ArticleWithRelations[]; total: number }> {
  const { search = '', status = '', limit = 50, offset = 0 } = options;
  const searchTerm = search.trim();
  const hasSearch = searchTerm.length > 0;
  const hasStatus = status === 'published' || status === 'draft';

  let total = 0;
  let rows: Record<string, unknown>[] = [];

  if (hasSearch && hasStatus) {
    if (status === 'published') {
      const countResult = await sql`
        SELECT COUNT(*)::int AS total FROM article a
        WHERE (a.title ILIKE ${'%' + searchTerm + '%'} OR a.slug ILIKE ${'%' + searchTerm + '%'} OR a.excerpt ILIKE ${'%' + searchTerm + '%'})
        AND a.status IN ('published', 'publish')
      `;
      total = Array.isArray(countResult) ? (countResult[0] as { total: number }).total : 0;
      rows = (await sql`
        SELECT a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
          a.published_at, a.updated_at, a.author_id, a.author_name, a.meta_title, a.meta_description,
          a.featured_image_url, a.featured_image_alt, a.exclude_from_place_hubs, a.primary_category_id,
          a.copiq_id, a.created_at,
          c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
        FROM article a
        LEFT JOIN article_category c ON c.category_id = a.primary_category_id
        WHERE (a.title ILIKE ${'%' + searchTerm + '%'} OR a.slug ILIKE ${'%' + searchTerm + '%'} OR a.excerpt ILIKE ${'%' + searchTerm + '%'})
        AND a.status IN ('published', 'publish')
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[];
    } else {
      const countResult = await sql`
        SELECT COUNT(*)::int AS total FROM article a
        WHERE (a.title ILIKE ${'%' + searchTerm + '%'} OR a.slug ILIKE ${'%' + searchTerm + '%'} OR a.excerpt ILIKE ${'%' + searchTerm + '%'})
        AND a.status = 'draft'
      `;
      total = Array.isArray(countResult) ? (countResult[0] as { total: number }).total : 0;
      rows = (await sql`
        SELECT a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
          a.published_at, a.updated_at, a.author_id, a.author_name, a.meta_title, a.meta_description,
          a.featured_image_url, a.featured_image_alt, a.exclude_from_place_hubs, a.primary_category_id,
          a.copiq_id, a.created_at,
          c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
        FROM article a
        LEFT JOIN article_category c ON c.category_id = a.primary_category_id
        WHERE (a.title ILIKE ${'%' + searchTerm + '%'} OR a.slug ILIKE ${'%' + searchTerm + '%'} OR a.excerpt ILIKE ${'%' + searchTerm + '%'})
        AND a.status = 'draft'
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[];
    }
  } else if (hasSearch) {
    const countResult = await sql`
      SELECT COUNT(*)::int AS total FROM article a
      WHERE (a.title ILIKE ${'%' + searchTerm + '%'} OR a.slug ILIKE ${'%' + searchTerm + '%'} OR a.excerpt ILIKE ${'%' + searchTerm + '%'})
    `;
    total = Array.isArray(countResult) ? (countResult[0] as { total: number }).total : 0;
    rows = (await sql`
      SELECT a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
        a.published_at, a.updated_at, a.author_id, a.author_name, a.meta_title, a.meta_description,
        a.featured_image_url, a.featured_image_alt, a.exclude_from_place_hubs, a.primary_category_id,
        a.copiq_id, a.created_at,
        c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
      FROM article a
      LEFT JOIN article_category c ON c.category_id = a.primary_category_id
      WHERE (a.title ILIKE ${'%' + searchTerm + '%'} OR a.slug ILIKE ${'%' + searchTerm + '%'} OR a.excerpt ILIKE ${'%' + searchTerm + '%'})
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Record<string, unknown>[];
  } else if (hasStatus) {
    if (status === 'published') {
      const countResult = await sql`SELECT COUNT(*)::int AS total FROM article WHERE status IN ('published', 'publish')`;
      total = Array.isArray(countResult) ? (countResult[0] as { total: number }).total : 0;
      rows = (await sql`
        SELECT a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
          a.published_at, a.updated_at, a.author_id, a.author_name, a.meta_title, a.meta_description,
          a.featured_image_url, a.featured_image_alt, a.exclude_from_place_hubs, a.primary_category_id,
          a.copiq_id, a.created_at,
          c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
        FROM article a
        LEFT JOIN article_category c ON c.category_id = a.primary_category_id
        WHERE a.status IN ('published', 'publish')
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[];
    } else {
      const countResult = await sql`SELECT COUNT(*)::int AS total FROM article WHERE status = 'draft'`;
      total = Array.isArray(countResult) ? (countResult[0] as { total: number }).total : 0;
      rows = (await sql`
        SELECT a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
          a.published_at, a.updated_at, a.author_id, a.author_name, a.meta_title, a.meta_description,
          a.featured_image_url, a.featured_image_alt, a.exclude_from_place_hubs, a.primary_category_id,
          a.copiq_id, a.created_at,
          c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
        FROM article a
        LEFT JOIN article_category c ON c.category_id = a.primary_category_id
        WHERE a.status = 'draft'
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[];
    }
  } else {
    const countResult = await sql`SELECT COUNT(*)::int AS total FROM article`;
    total = Array.isArray(countResult) ? (countResult[0] as { total: number }).total : 0;
    rows = (await sql`
      SELECT a.article_id, a.slug, a.title, a.excerpt, a.content, a.article_type, a.status,
        a.published_at, a.updated_at, a.author_id, a.author_name, a.meta_title, a.meta_description,
        a.featured_image_url, a.featured_image_alt, a.exclude_from_place_hubs, a.primary_category_id,
        a.copiq_id, a.created_at,
        c.category_id AS cat_id, c.slug AS cat_slug, c.name AS cat_name
      FROM article a
      LEFT JOIN article_category c ON c.category_id = a.primary_category_id
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Record<string, unknown>[];
  }

  const articles: ArticleWithRelations[] = await Promise.all(
    rows.map(async (row) => {
      const articleId = row.article_id as string;
      const places = await sql`
        SELECT ap.article_place_id, ap.article_id, ap.place_id, ap.primary_place,
               p.place_id AS p_place_id, p.slug AS p_slug, p.name AS p_name
        FROM article_place ap
        JOIN place p ON p.place_id = ap.place_id
        WHERE ap.article_id = ${articleId}
      `;
      const placeList = (Array.isArray(places) ? places : []) as ArticlePlaceRow[];
      return {
        article_id: row.article_id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        content: row.content,
        article_type: row.article_type,
        status: row.status,
        published_at: row.published_at,
        updated_at: row.updated_at,
        author_id: row.author_id,
        author_name: row.author_name,
        author_bio: null,
        author_image_url: null,
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        featured_image_url: row.featured_image_url,
        featured_image_alt: row.featured_image_alt,
        exclude_from_place_hubs: row.exclude_from_place_hubs,
        primary_category_id: row.primary_category_id,
        copiq_id: row.copiq_id,
        copiq_social_posts: null,
        pr_contacts: null,
        created_at: row.created_at,
        view_count: null,
        article_category: row.cat_id
          ? {
              category_id: row.cat_id,
              slug: row.cat_slug,
              name: row.cat_name,
              description: null,
              parent_category_id: null,
              sort_order: null,
              created_at: null,
            }
          : null,
        article_place: placeList.map((p) => ({
          article_place_id: p.article_place_id,
          article_id: p.article_id,
          place_id: p.place_id,
          primary_place: p.primary_place,
          place: {
            place_id: p.p_place_id,
            slug: p.p_slug,
            name: p.p_name,
            type: (p.p_type as string) ?? '',
          },
        })),
      } as ArticleWithRelations;
    })
  );

  return { articles, total };
}

export async function countArticles(where?: { status?: string }): Promise<number> {
  if (where?.status === 'draft') {
    const r = await sql`SELECT COUNT(*)::int AS c FROM article WHERE status = 'draft'`;
    return Array.isArray(r) ? (r[0] as { c: number }).c : 0;
  }
  if (where?.status === 'published') {
    const r = await sql`SELECT COUNT(*)::int AS c FROM article WHERE status IN ('published', 'publish')`;
    return Array.isArray(r) ? (r[0] as { c: number }).c : 0;
  }
  const r = await sql`SELECT COUNT(*)::int AS c FROM article`;
  return Array.isArray(r) ? (r[0] as { c: number }).c : 0;
}

export async function countUncategorized(): Promise<number> {
  const uncat = await sql`
    SELECT category_id FROM article_category
    WHERE slug = 'uncategorized' OR name ILIKE '%Uncategorized%'
    LIMIT 1
  `;
  const cat = Array.isArray(uncat) ? uncat[0] : null;
  if (!cat) return 0;
  const r = await sql`
    SELECT COUNT(*)::int AS c FROM article
    WHERE primary_category_id = ${(cat as { category_id: string }).category_id}
    AND article_type IN ('news', 'inspiration', 'history', 'guide', 'route')
  `;
  return Array.isArray(r) ? (r[0] as { c: number }).c : 0;
}
