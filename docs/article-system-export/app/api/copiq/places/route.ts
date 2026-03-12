import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/copiq/places
 * 
 * Get places for article linking.
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 * 
 * Query params:
 *   all: boolean - If true, returns ALL places (for caching/lookup)
 *   q: string - Search query (searches name and slug)
 *   limit: number - Max results to return (default: 50, max: 200, ignored if all=true)
 * 
 * Returns:
 *   200: { success: true, count: number, places: Array<{name, slug, type}> }
 *   401: { code: "UNAUTHORIZED", message: "Invalid API key" }
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { 
        code: 'UNAUTHORIZED', 
        message: 'Invalid API key' 
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('all') === 'true';
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // If all=true, return complete place list for caching
    if (fetchAll) {
      const places = await prisma.place.findMany({
        select: {
          name: true,
          slug: true,
          type: true,
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' }
        ],
      });

      return NextResponse.json({
        success: true,
        count: places.length,
        places: places.map(p => ({
          name: p.name,
          slug: p.slug,
          type: p.type
        }))
      });
    }

    // If no query, return top places by entity count
    if (!query) {
      const places = await prisma.place.findMany({
        where: {
          type: {
            in: ['city', 'town']
          }
        },
        select: {
          place_id: true,
          name: true,
          slug: true,
          type: true,
          entity_count: true
        },
        orderBy: [
          { entity_count: 'desc' },
          { name: 'asc' }
        ],
        take: limit
      });

      return NextResponse.json({
        success: true,
        count: places.length,
        places: places.map(p => ({
          name: p.name,
          slug: p.slug,
          type: p.type
        }))
      });
    }

    // Search by name or slug
    const places = await prisma.place.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            slug: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        place_id: true,
        name: true,
        slug: true,
        type: true,
        entity_count: true
      },
      orderBy: [
        { entity_count: 'desc' },
        { name: 'asc' }
      ],
      take: limit
    });

    return NextResponse.json({
      success: true,
      count: places.length,
      places: places.map(p => ({
        name: p.name,
        slug: p.slug,
        type: p.type
      }))
    });
  } catch (error) {
    console.error('[Copiq API] Failed to search places:', error);
    return NextResponse.json(
      {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to search places',
      },
      { status: 500 }
    );
  }
}
