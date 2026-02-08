import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getBrandByHandle } from '@/lib/mapping/brand-mapping';

const ensureBrandContentTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS brand_content (
      id SERIAL PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
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
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    await ensureBrandContentTable();
    const { handle } = await params;
    const base = getBrandByHandle(handle);
    if (!base) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    const overrideResult = await sql`
      SELECT *
      FROM brand_content
      WHERE handle = ${handle}
      LIMIT 1
    `;
    return NextResponse.json({ brand: base, override: overrideResult.rows[0] || null });
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
    const base = getBrandByHandle(handle);
    if (!base) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = await sql`
      INSERT INTO brand_content (
        handle,
        title,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        status,
        updated_at
      ) VALUES (
        ${handle},
        ${String(body?.title || base.title)},
        ${String(body?.h1_title || '')},
        ${String(body?.meta_title || '')},
        ${String(body?.meta_description || '')},
        ${String(body?.short_description || '')},
        ${String(body?.long_description || '')},
        ${String(body?.breadcrumb_label || '')},
        ${String(body?.faq_json || '')},
        ${String(body?.status || 'published')},
        NOW()
      )
      ON CONFLICT (handle) DO UPDATE
      SET
        title = EXCLUDED.title,
        h1_title = EXCLUDED.h1_title,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        short_description = EXCLUDED.short_description,
        long_description = EXCLUDED.long_description,
        breadcrumb_label = EXCLUDED.breadcrumb_label,
        faq_json = EXCLUDED.faq_json,
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
