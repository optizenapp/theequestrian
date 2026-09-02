import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { sql } from '@/lib/db/vercel-postgres';
import { invalidateHomeSectionsCache } from '@/lib/content/home';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await ensureHomeSectionsTable();
    const { key } = await params;
    const result = await sql`
      SELECT *
      FROM home_sections
      WHERE key = ${key}
      LIMIT 1
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    return NextResponse.json({ section: result.rows[0] });
  } catch (error) {
    console.error('Error fetching home section:', error);
    return NextResponse.json({ error: 'Failed to fetch home section' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await ensureHomeSectionsTable();
    const { key } = await params;
    const body = await request.json();
    const result = await sql`
      UPDATE home_sections
      SET
        type = ${String(body?.type || '')},
        enabled = ${Boolean(body?.enabled ?? true)},
        sort_order = ${Number(body?.sort_order ?? 0)},
        eyebrow = ${String(body?.eyebrow || '')},
        title_html = ${String(body?.title_html || '')},
        subtitle_html = ${String(body?.subtitle_html || '')},
        body_html = ${String(body?.body_html || '')},
        cta_text = ${String(body?.cta_text || '')},
        cta_link = ${String(body?.cta_link || '')},
        secondary_cta_text = ${String(body?.secondary_cta_text || '')},
        secondary_cta_link = ${String(body?.secondary_cta_link || '')},
        image_url = ${String(body?.image_url || '')},
        image_alt = ${String(body?.image_alt || '')},
        image_link = ${String(body?.image_link || '')},
        most_wanted_items_json = ${body?.most_wanted_items_json ? JSON.stringify(body.most_wanted_items_json) : null},
        product_handles = ${String(body?.product_handles || '')},
        faqs_json = ${body?.faqs_json ? JSON.stringify(body.faqs_json) : null},
        seen_in_json = ${body?.seen_in_json ? JSON.stringify(body.seen_in_json) : null},
        items_json = ${body?.items_json ? JSON.stringify(body.items_json) : null},
        updated_at = NOW()
      WHERE key = ${key}
      RETURNING *
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    invalidateHomeSectionsCache();
    revalidateTag('home-sections', 'max');
    revalidatePath('/');
    return NextResponse.json({ section: result.rows[0] });
  } catch (error) {
    console.error('Error updating home section:', error);
    return NextResponse.json({ error: 'Failed to update home section' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await ensureHomeSectionsTable();
    const { key } = await params;
    await sql`
      DELETE FROM home_sections
      WHERE key = ${key}
    `;
    invalidateHomeSectionsCache();
    revalidateTag('home-sections', 'max');
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting home section:', error);
    return NextResponse.json({ error: 'Failed to delete home section' }, { status: 500 });
  }
}
