import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { invalidateCache } from '@/lib/content/collections';

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
    const existingResult = await sql`
      SELECT *
      FROM collection_content
      WHERE id = ${id}
      LIMIT 1
    `;

    const existing = existingResult.rows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const hasUrlPath = typeof body?.url_path !== 'undefined';
    const nextUrlPath = hasUrlPath ? normalizePath(String(body?.url_path || '')) : String(existing.url_path);
    const hierarchy = buildHierarchyFromPath(nextUrlPath);

    const nextParentUrl = typeof body?.parent_url !== 'undefined'
      ? (body.parent_url ? String(body.parent_url) : null)
      : hierarchy.parentUrl;
    const nextCategoryLevel = typeof body?.category_level !== 'undefined'
      ? Number(body.category_level)
      : hierarchy.categoryLevel;

    const hasVersion = typeof body?.version !== 'undefined';
    const hasGeneratedBy = typeof body?.generated_by !== 'undefined';

    const result = await sql`
      UPDATE collection_content
      SET
        url_path = ${nextUrlPath},
        h1_title = ${typeof body?.h1_title !== 'undefined' ? String(body.h1_title || '') : String(existing.h1_title || '')},
        meta_title = ${typeof body?.meta_title !== 'undefined' ? String(body.meta_title || '') : String(existing.meta_title || '')},
        meta_description = ${typeof body?.meta_description !== 'undefined' ? String(body.meta_description || '') : String(existing.meta_description || '')},
        short_description = ${typeof body?.short_description !== 'undefined' ? String(body.short_description || '') : String(existing.short_description || '')},
        long_description = ${typeof body?.long_description !== 'undefined' ? String(body.long_description || '') : String(existing.long_description || '')},
        breadcrumb_label = ${typeof body?.breadcrumb_label !== 'undefined' ? String(body.breadcrumb_label || '') : String(existing.breadcrumb_label || '')},
        parent_url = ${nextParentUrl},
        category_level = ${nextCategoryLevel},
        status = ${typeof body?.status !== 'undefined' ? String(body.status || 'published') : String(existing.status || 'published')},
        default_sort = ${typeof body?.default_sort !== 'undefined' ? String(body.default_sort || 'best-selling') : String(existing.default_sort || 'best-selling')},
        faq_items = ${
          typeof body?.faq_items !== 'undefined'
            ? JSON.stringify(parseJsonArray(body.faq_items))
            : JSON.stringify(parseJsonArray(existing.faq_items))
        },
        related_categories = ${
          typeof body?.related_categories !== 'undefined'
            ? JSON.stringify(parseJsonArray(body.related_categories))
            : JSON.stringify(parseJsonArray(existing.related_categories))
        },
        generated_by = ${hasGeneratedBy ? String(body.generated_by || '') : String(existing.generated_by || '')},
        version = ${hasVersion ? Number(body.version) : Number(existing.version || 1)},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    invalidateCache();
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
    invalidateCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
