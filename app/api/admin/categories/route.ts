import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCategoryAllocationCounts } from '@/lib/db/product-allocations';
import { invalidateCache } from '@/lib/content/collections';
import { revalidatePath } from 'next/cache';

type SqlParam = string | number;

interface CategoryBase {
  url_path: string;
  category_level: number;
  parent_url: string | null;
}

interface ContentRow extends CategoryBase {
  id: number;
  status: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
}

const ensureCollectionContentTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS collection_content (
      id SERIAL PRIMARY KEY,
      url_path TEXT UNIQUE NOT NULL,
      breadcrumb_label TEXT,
      parent_url TEXT,
      category_level INTEGER NOT NULL DEFAULT 1,
      h1_title TEXT NOT NULL,
      meta_title TEXT,
      meta_description TEXT,
      short_description TEXT,
      long_description TEXT,
      faq_items JSONB DEFAULT '[]'::jsonb,
      related_categories JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'published',
      default_sort TEXT DEFAULT 'best-selling',
      generated_by TEXT,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
};

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
};

const parseJsonArray = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildHierarchyFromPath = (urlPath: string) => {
  const normalized = normalizePath(urlPath);
  const parts = normalized.replace(/^\//, '').split('/').filter(Boolean);
  const parentUrl = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}` : null;
  return {
    normalized,
    categoryLevel: parts.length || 1,
    parentUrl,
  };
};

export async function GET(request: NextRequest) {
  try {
    await ensureCollectionContentTable();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'all';
    const level = searchParams.get('level')?.trim() || '';

    const mappingRows = await sql`
      SELECT DISTINCT top_level, parent_category, subcategory_handle
      FROM collection_mapping
      WHERE action != 'exclude'
      ORDER BY top_level, parent_category, subcategory_handle
    `;

    const mappingPaths = mappingRows.rows
      .map((row) => {
        const parts = [row.top_level, row.parent_category, row.subcategory_handle].filter(Boolean);
        if (!parts.length) return null;
        const urlPath = normalizePath(parts.join('/'));
        return {
          url_path: urlPath,
          category_level: parts.length,
          parent_url: parts.length > 1 ? `/${parts.slice(0, -1).join('/')}` : null,
        };
      })
      .filter(Boolean) as Array<{ url_path: string; category_level: number; parent_url: string | null }>;

    let contentQuery = 'SELECT * FROM collection_content WHERE 1=1';
    const params: SqlParam[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      contentQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (level) {
      contentQuery += ` AND category_level = $${paramIndex}`;
      params.push(Number(level));
      paramIndex++;
    }

    if (search) {
      contentQuery += ` AND (url_path ILIKE $${paramIndex} OR h1_title ILIKE $${paramIndex} OR meta_title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    contentQuery += ' ORDER BY url_path';
    const contentResult = await sql.query(contentQuery, params);
    const contentRows = contentResult.rows as ContentRow[];

    const contentMap = new Map<string, ContentRow>();
    for (const row of contentRows) {
      contentMap.set(row.url_path, row);
    }

    const includeMapping = !search && (status === 'all' || !status);
    const pathSet = new Set<string>();
    const merged: CategoryBase[] = [];

    if (includeMapping) {
      for (const mapping of mappingPaths) {
        if (!pathSet.has(mapping.url_path)) {
          pathSet.add(mapping.url_path);
          merged.push(mapping);
        }
      }
    }

    for (const row of contentRows) {
      if (!pathSet.has(row.url_path)) {
        pathSet.add(row.url_path);
        merged.push({
          url_path: row.url_path,
          category_level: row.category_level,
          parent_url: row.parent_url,
        });
      }
    }

    const allocationCounts = await getCategoryAllocationCounts();
    const countMap = new Map(allocationCounts.map((row) => [row.category_path, row.product_count]));

    const categories = merged.map((item) => {
      const content = contentMap.get(item.url_path);
      const hierarchy = buildHierarchyFromPath(item.url_path);
      return {
        id: content?.id ?? null,
        url_path: item.url_path,
        category_level: item.category_level ?? hierarchy.categoryLevel,
        parent_url: content?.parent_url ?? hierarchy.parentUrl,
        status: content?.status ?? 'missing',
        h1_title: content?.h1_title ?? '',
        meta_title: content?.meta_title ?? '',
        meta_description: content?.meta_description ?? '',
        product_count: countMap.get(item.url_path) ?? 0,
        has_content: Boolean(content),
      };
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCollectionContentTable();
    const body = await request.json();
    const urlPath = normalizePath(String(body?.url_path || ''));
    const h1Title = String(body?.h1_title || '').trim();

    if (!urlPath || urlPath === '/') {
      return NextResponse.json({ error: 'Missing url_path' }, { status: 400 });
    }
    if (!h1Title) {
      return NextResponse.json({ error: 'Missing h1_title' }, { status: 400 });
    }

    const hierarchy = buildHierarchyFromPath(urlPath);

    const result = await sql`
      INSERT INTO collection_content (
        url_path,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        parent_url,
        category_level,
        status,
        default_sort,
        faq_items,
        related_categories,
        generated_by
      ) VALUES (
        ${urlPath},
        ${h1Title},
        ${String(body?.meta_title || '')},
        ${String(body?.meta_description || '')},
        ${String(body?.short_description || '')},
        ${String(body?.long_description || '')},
        ${String(body?.breadcrumb_label || '')},
        ${hierarchy.parentUrl},
        ${hierarchy.categoryLevel},
        ${String(body?.status || 'published')},
        ${String(body?.default_sort || 'best-selling')},
        ${JSON.stringify(parseJsonArray(body?.faq_items))},
        ${JSON.stringify(parseJsonArray(body?.related_categories))},
        ${String(body?.generated_by || 'manual')}
      )
      RETURNING *
    `;

    invalidateCache();
    revalidatePath(urlPath);
    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
