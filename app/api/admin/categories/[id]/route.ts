import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCollectionContentTable();
    const { id } = await params;
    const result = await sql`
      SELECT *
      FROM collection_content
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCollectionContentTable();
    const { id } = await params;
    const body = await request.json();
    const urlPath = normalizePath(String(body?.url_path || ''));
    const hierarchy = buildHierarchyFromPath(urlPath);

    const result = await sql`
      UPDATE collection_content
      SET
        url_path = ${urlPath},
        h1_title = ${String(body?.h1_title || '')},
        meta_title = ${String(body?.meta_title || '')},
        meta_description = ${String(body?.meta_description || '')},
        short_description = ${String(body?.short_description || '')},
        long_description = ${String(body?.long_description || '')},
        breadcrumb_label = ${String(body?.breadcrumb_label || '')},
        parent_url = ${hierarchy.parentUrl},
        category_level = ${hierarchy.categoryLevel},
        status = ${String(body?.status || 'published')},
        default_sort = ${String(body?.default_sort || 'best-selling')},
        faq_items = ${JSON.stringify(parseJsonArray(body?.faq_items))},
        related_categories = ${JSON.stringify(parseJsonArray(body?.related_categories))},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureCollectionContentTable();
    const { id } = await params;
    await sql`
      DELETE FROM collection_content
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
