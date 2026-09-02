import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

const ensureStaticPagesTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS static_pages (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      meta_title TEXT,
      meta_description TEXT,
      intro_html TEXT,
      body_html TEXT,
      bottom_html TEXT,
      status TEXT DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON static_pages(slug)`;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureStaticPagesTable();
    const { slug } = await params;
    const result = await sql`
      SELECT *
      FROM static_pages
      WHERE slug = ${slug}
      LIMIT 1
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Error fetching static page:', error);
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureStaticPagesTable();
    const { slug } = await params;
    const body = await request.json();
    const result = await sql`
      UPDATE static_pages
      SET
        title = ${String(body?.title || '')},
        meta_title = ${String(body?.meta_title || '')},
        meta_description = ${String(body?.meta_description || '')},
        intro_html = ${String(body?.intro_html || '')},
        body_html = ${String(body?.body_html || '')},
        bottom_html = ${String(body?.bottom_html || '')},
        status = ${String(body?.status || 'published')},
        updated_at = NOW()
      WHERE slug = ${slug}
      RETURNING *
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Error updating static page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureStaticPagesTable();
    const { slug } = await params;
    await sql`
      DELETE FROM static_pages
      WHERE slug = ${slug}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting static page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}
