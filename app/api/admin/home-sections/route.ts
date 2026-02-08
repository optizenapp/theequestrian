import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const ensureHomeSectionsTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS home_sections (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      eyebrow TEXT,
      title_html TEXT,
      subtitle_html TEXT,
      body_html TEXT,
      cta_text TEXT,
      cta_link TEXT,
      secondary_cta_text TEXT,
      secondary_cta_link TEXT,
      image_url TEXT,
      image_alt TEXT,
      image_link TEXT,
      most_wanted_items_json JSONB,
      product_handles TEXT,
      faqs_json JSONB,
      seen_in_json JSONB,
      items_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
};

export async function GET() {
  try {
    await ensureHomeSectionsTable();
    const result = await sql`
      SELECT *
      FROM home_sections
      ORDER BY sort_order ASC
    `;
    return NextResponse.json({ sections: result.rows });
  } catch (error) {
    console.error('Error fetching home sections:', error);
    return NextResponse.json({ error: 'Failed to fetch home sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureHomeSectionsTable();
    const body = await request.json();
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    const type = typeof body?.type === 'string' ? body.type.trim() : '';
    if (!key || !type) {
      return NextResponse.json({ error: 'Missing key or type' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO home_sections (
        key,
        type,
        enabled,
        sort_order,
        eyebrow,
        title_html,
        subtitle_html,
        body_html,
        cta_text,
        cta_link,
        secondary_cta_text,
        secondary_cta_link,
        image_url,
        image_alt,
        image_link,
        most_wanted_items_json,
        product_handles,
        faqs_json,
        seen_in_json,
        items_json,
        updated_at
      ) VALUES (
        ${key},
        ${type},
        ${Boolean(body?.enabled ?? true)},
        ${Number(body?.sort_order ?? 0)},
        ${String(body?.eyebrow || '')},
        ${String(body?.title_html || '')},
        ${String(body?.subtitle_html || '')},
        ${String(body?.body_html || '')},
        ${String(body?.cta_text || '')},
        ${String(body?.cta_link || '')},
        ${String(body?.secondary_cta_text || '')},
        ${String(body?.secondary_cta_link || '')},
        ${String(body?.image_url || '')},
        ${String(body?.image_alt || '')},
        ${String(body?.image_link || '')},
        ${body?.most_wanted_items_json ? JSON.stringify(body.most_wanted_items_json) : null},
        ${String(body?.product_handles || '')},
        ${body?.faqs_json ? JSON.stringify(body.faqs_json) : null},
        ${body?.seen_in_json ? JSON.stringify(body.seen_in_json) : null},
        ${body?.items_json ? JSON.stringify(body.items_json) : null},
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({ section: result.rows[0] });
  } catch (error) {
    console.error('Error creating home section:', error);
    return NextResponse.json({ error: 'Failed to create home section' }, { status: 500 });
  }
}
