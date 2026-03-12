import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';

export async function GET() {
  try {
    const uncategorized = await sql`
      SELECT category_id FROM article_category
      WHERE slug = 'uncategorized' OR name ILIKE '%Uncategorized%'
      LIMIT 1
    `;
    const cat = Array.isArray(uncategorized) ? uncategorized[0] : null;
    if (!cat) {
      return NextResponse.json({ success: true, articles: [] });
    }
    const categoryId = (cat as { category_id: string }).category_id;
    const rows = await sql`
      SELECT article_id, slug, title, excerpt, article_type, published_at
      FROM article
      WHERE primary_category_id = ${categoryId}
      AND article_type IN ('news', 'inspiration', 'history', 'guide', 'route')
      ORDER BY published_at DESC NULLS LAST
    `;
    const articles = Array.isArray(rows) ? rows : [];
    return NextResponse.json({ success: true, articles });
  } catch (error) {
    console.error('[uncategorized]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}
