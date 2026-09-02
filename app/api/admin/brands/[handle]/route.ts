import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

const ensureBrandContentTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS brand_content (
      id SERIAL PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      products_count INTEGER DEFAULT 0,
      h1_title TEXT,
      meta_title TEXT,
      meta_description TEXT,
      short_description TEXT,
      long_description TEXT,
      breadcrumb_label TEXT,
      faq_json TEXT,
      status TEXT DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_handle ON brand_content(handle)`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS products_count INTEGER DEFAULT 0`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS rules TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS logo_url TEXT`;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    await ensureBrandContentTable();
    const { handle } = await params;
    const existing = await sql`
      SELECT *
      FROM brand_content
      WHERE handle = ${handle}
      LIMIT 1
    `;
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ brand: existing.rows[0], override: existing.rows[0] || null });
  } catch (error) {
    console.error('Error fetching brand content:', error);
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    await ensureBrandContentTable();
    const { handle } = await params;
    const existing = await sql`
      SELECT *
      FROM brand_content
      WHERE handle = ${handle}
      LIMIT 1
    `;
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    const base = existing.rows[0];

    const body = await request.json();
    const result = await sql`
      INSERT INTO brand_content (
        handle,
        title,
        products_count,
        rules,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        logo_url,
        status,
        updated_at
      ) VALUES (
        ${handle},
        ${String(body?.title || base.title || handle)},
        ${Number(body?.products_count ?? base.products_count ?? 0)},
        ${body?.rules !== undefined ? String(body.rules) : (base.rules ?? null)},
        ${String(body?.h1_title ?? base.h1_title ?? '')},
        ${String(body?.meta_title ?? base.meta_title ?? '')},
        ${String(body?.meta_description ?? base.meta_description ?? '')},
        ${String(body?.short_description ?? base.short_description ?? '')},
        ${String(body?.long_description ?? base.long_description ?? '')},
        ${String(body?.breadcrumb_label ?? base.breadcrumb_label ?? '')},
        ${String(body?.faq_json ?? base.faq_json ?? '')},
        ${body?.logo_url !== undefined ? (body.logo_url ? String(body.logo_url) : null) : (base.logo_url ?? null)},
        ${String(body?.status || 'published')},
        NOW()
      )
      ON CONFLICT (handle) DO UPDATE
      SET
        title = EXCLUDED.title,
        products_count = EXCLUDED.products_count,
        rules = EXCLUDED.rules,
        h1_title = EXCLUDED.h1_title,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        short_description = EXCLUDED.short_description,
        long_description = EXCLUDED.long_description,
        breadcrumb_label = EXCLUDED.breadcrumb_label,
        faq_json = EXCLUDED.faq_json,
        logo_url = EXCLUDED.logo_url,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ override: result.rows[0] });
  } catch (error) {
    console.error('Error updating brand content:', error);
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}
