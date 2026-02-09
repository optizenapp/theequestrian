import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * GET /api/admin/mega-menu
 * Get all mega menu content
 */
export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM mega_menu_content
      ORDER BY category
    `;
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching mega menu content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mega menu content' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/mega-menu/[category]
 * Update mega menu content for a category
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      category,
      featured_image_url,
      featured_title,
      featured_subtitle,
      featured_link,
      quick_links,
      subcategory_cards,
    } = body;
    
    await sql`
      INSERT INTO mega_menu_content (
        category,
        featured_image_url,
        featured_title,
        featured_subtitle,
        featured_link,
        quick_links,
        subcategory_cards
      ) VALUES (
        ${category},
        ${featured_image_url || null},
        ${featured_title || null},
        ${featured_subtitle || null},
        ${featured_link || null},
        ${JSON.stringify(quick_links || [])},
        ${JSON.stringify(subcategory_cards || [])}
      )
      ON CONFLICT (category) 
      DO UPDATE SET
        featured_image_url = EXCLUDED.featured_image_url,
        featured_title = EXCLUDED.featured_title,
        featured_subtitle = EXCLUDED.featured_subtitle,
        featured_link = EXCLUDED.featured_link,
        quick_links = EXCLUDED.quick_links,
        subcategory_cards = EXCLUDED.subcategory_cards,
        updated_at = NOW()
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating mega menu content:', error);
    return NextResponse.json(
      { error: 'Failed to update mega menu content' },
      { status: 500 }
    );
  }
}
