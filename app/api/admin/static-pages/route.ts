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

export async function GET() {
  try {
    await ensureStaticPagesTable();
    const result = await sql`
      SELECT slug, title, status, updated_at
      FROM static_pages
      ORDER BY slug
    `;
    return NextResponse.json({ pages: result.rows });
  } catch (error) {
    console.error('Error fetching static pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureStaticPagesTable();
    const body = await request.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!slug || !title) {
      return NextResponse.json({ error: 'Missing slug or title' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO static_pages (slug, title, meta_title, meta_description, intro_html, body_html, bottom_html, status)
      VALUES (
        ${slug},
        ${title},
        ${String(body?.meta_title || '')},
        ${String(body?.meta_description || '')},
        ${String(body?.intro_html || '')},
        ${String(body?.body_html || '')},
        ${String(body?.bottom_html || '')},
        ${String(body?.status || 'published')}
      )
      RETURNING *
    `;

    return NextResponse.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Error creating static page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
