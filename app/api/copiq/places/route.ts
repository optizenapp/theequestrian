import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { sql } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('all') === 'true';
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    if (fetchAll) {
      const rows = await sql`
        SELECT name, slug, type FROM place
        ORDER BY type ASC, name ASC
      `;
      const places = Array.isArray(rows) ? rows : [];
      return NextResponse.json({
        success: true,
        count: places.length,
        places: places.map((p: Record<string, unknown>) => ({
          name: p.name,
          slug: p.slug,
          type: p.type,
        })),
      });
    }

    if (!query) {
      const rows = await sql`
        SELECT name, slug, type FROM place
        WHERE type IN ('city', 'town')
        ORDER BY name ASC
        LIMIT ${limit}
      `;
      const places = Array.isArray(rows) ? rows : [];
      return NextResponse.json({
        success: true,
        count: places.length,
        places: places.map((p: Record<string, unknown>) => ({
          name: p.name,
          slug: p.slug,
          type: p.type,
        })),
      });
    }

    const searchTerm = `%${query}%`;
    const rows = await sql`
      SELECT name, slug, type FROM place
      WHERE name ILIKE ${searchTerm} OR slug ILIKE ${searchTerm}
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    const places = Array.isArray(rows) ? rows : [];
    return NextResponse.json({
      success: true,
      count: places.length,
      places: places.map((p: Record<string, unknown>) => ({
        name: p.name,
        slug: p.slug,
        type: p.type,
      })),
    });
  } catch (error) {
    console.error('[Copiq API] Places failed:', error);
    return NextResponse.json(
      {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to search places',
      },
      { status: 500 }
    );
  }
}
