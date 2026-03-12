import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { prisma } from '@/lib/prisma';
import { getArticleUrl } from '@/lib/articles';
import { buildEntityUrl } from '@/lib/master-types';

/**
 * GET /api/copiq/search
 * 
 * Search existing content for social media post creation.
 * Returns articles, entities, places, and events matching the query.
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 * 
 * Query Parameters:
 *   q (required): Search query string
 *   type (optional): Filter by content type (article, entity, place, event)
 *   limit (optional): Max results per type (default: 10)
 * 
 * Returns:
 *   200: { data: [...] }
 *   400: { code: "VALIDATION_ERROR", message: "..." }
 *   401: { code: "UNAUTHORIZED", message: "Invalid API key" }
 *   500: { code: "SEARCH_FAILED", message: "..." }
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
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const typeFilter = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required and must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();
    const results: any[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yorkshire.com';

    // Search Articles
    if (!typeFilter || typeFilter === 'article') {
      const articles = await prisma.article.findMany({
        where: {
          status: 'published',
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { excerpt: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          article_id: true,
          title: true,
          slug: true,
          excerpt: true,
          content: true,
          featured_image_url: true,
          article_type: true,
          published_at: true,
          exclude_from_place_hubs: true,
          article_category: {
            select: { slug: true, name: true }
          },
          article_place: {
            where: { primary_place: true },
            select: { place: { select: { slug: true, name: true } } },
            take: 1
          }
        },
        orderBy: { published_at: 'desc' },
        take: limit,
      });

      for (const article of articles) {
        const articleUrl = getArticleUrl({
          slug: article.slug,
          article_type: article.article_type,
          exclude_from_place_hubs: article.exclude_from_place_hubs,
          article_category: article.article_category,
          article_place: article.article_place,
        });

        results.push({
          type: 'article',
          id: article.article_id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt || article.content?.substring(0, 200) + '...',
          url: `${baseUrl}${articleUrl}`,
          images: article.featured_image_url ? [article.featured_image_url] : [],
          date: article.published_at?.toISOString(),
          meta: {
            article_type: article.article_type,
            category: article.article_category?.name,
            place: article.article_place[0]?.place?.name,
          }
        });
      }
    }

    // Search Entities (businesses, attractions, etc.)
    if (!typeFilter || typeFilter === 'entity') {
      const entities = await prisma.entity.findMany({
        where: {
          is_searchable: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { short_description: { contains: searchTerm, mode: 'insensitive' } },
            { long_description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          entity_id: true,
          name: true,
          slug: true,
          place_slug: true,
          type_slug: true,
          short_description: true,
          long_description: true,
          main_image_url: true,
          canonical_url: true,
          website_url_direct: true,
        },
        orderBy: { name: 'asc' },
        take: limit,
      });

      for (const entity of entities) {
        const entityUrl = entity.canonical_url || buildEntityUrl({
          slug: entity.slug,
          type_slug: entity.type_slug,
          place_slug: entity.place_slug,
        });

        // Get additional images
        const images = await prisma.entity_image.findMany({
          where: { entity_id: entity.entity_id },
          select: { image_url: true },
          take: 5,
        });

        const allImages = [
          entity.main_image_url,
          ...images.map(i => i.image_url)
        ].filter(Boolean) as string[];

        // Get affiliate links
        const affiliateMap = await prisma.entity_affiliate_map.findMany({
          where: { entity_id: entity.entity_id },
          select: { affiliate_type: true, affiliate_link_template: true },
          take: 3,
        });
        const bookingLink = affiliateMap.find(a => a.affiliate_type === 'booking_com')?.affiliate_link_template;

        results.push({
          type: 'entity',
          id: entity.entity_id,
          title: entity.name,
          content: entity.long_description || entity.short_description,
          excerpt: entity.short_description,
          url: `${baseUrl}${entityUrl}`,
          images: allImages,
          meta: {
            entity_type: entity.type_slug,
            place: entity.place_slug,
            website: entity.website_url_direct,
            book_now: bookingLink,
          }
        });
      }
    }

    // Search Places
    if (!typeFilter || typeFilter === 'place') {
      const places = await prisma.place.findMany({
        where: {
          type: { in: ['city', 'town', 'village'] },
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          place_id: true,
          name: true,
          slug: true,
          type: true,
          description: true,
          image_url: true,
          wikidata_id: true,
          facts: true,
          entity_count: true,
        },
        orderBy: { entity_count: 'desc' },
        take: limit,
      });

      for (const place of places) {
        // Get recent articles about this place
        const recentArticles = await prisma.article.findMany({
          where: {
            status: 'published',
            article_place: { some: { place: { slug: place.slug } } }
          },
          select: { title: true, slug: true },
          orderBy: { published_at: 'desc' },
          take: 3,
        });

        // Get upcoming events count via entity_event with venue in this place
        const upcomingEventsCount = await prisma.entity_event.count({
          where: {
            start_date: { gte: new Date() },
            entity_entity_event_venue_entity_idToentity: { place_slug: place.slug }
          }
        });

        // Extract facts/wikidata stats
        const facts = place.facts as any;
        const stats = {
          population: facts?.population,
          county: facts?.county,
          region: facts?.region,
        };

        results.push({
          type: 'place',
          id: place.place_id,
          title: place.name,
          content: place.description,
          excerpt: place.description?.substring(0, 200) + '...',
          url: `${baseUrl}/${place.slug}`,
          images: place.image_url ? [place.image_url] : [],
          meta: {
            place_type: place.type,
            entity_count: place.entity_count,
            upcoming_events: upcomingEventsCount,
            recent_articles: recentArticles.map(a => a.title),
            stats,
          }
        });
      }
    }

    // Search Events
    if (!typeFilter || typeFilter === 'event') {
      const events = await prisma.entity_event.findMany({
        where: {
          start_date: { gte: new Date() },
          status: 'scheduled',
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          event_id: true,
          title: true,
          description: true,
          short_description: true,
          start_date: true,
          end_date: true,
          main_image_url: true,
          ticket_url_primary: true,
          ticket_info: true,
          is_free: true,
          entity_entity_event_venue_entity_idToentity: {
            select: {
              name: true,
              slug: true,
              place_slug: true,
            }
          },
          entity_entity_event_event_idToentity: {
            select: {
              slug: true,
            }
          }
        },
        orderBy: { start_date: 'asc' },
        take: limit,
      });

      for (const event of events) {
        const venue = event.entity_entity_event_venue_entity_idToentity;
        const eventEntity = event.entity_entity_event_event_idToentity;
        const placeSlug = venue?.place_slug || 'yorkshire';
        const eventSlug = eventEntity?.slug || event.event_id;
        const eventUrl = `/${placeSlug}/events/${eventSlug}`;

        // Calculate urgency (this weekend, tomorrow, etc.)
        const now = new Date();
        const eventDate = event.start_date ? new Date(event.start_date) : now;
        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let urgency: string | null = null;
        if (daysUntil === 0) urgency = 'today';
        else if (daysUntil === 1) urgency = 'tomorrow';
        else if (daysUntil <= 3) urgency = 'this_week';
        else if (daysUntil <= 7) urgency = 'this_weekend';

        // Extract price info from ticket_info JSON
        const ticketInfo = event.ticket_info as any;
        const priceMin = ticketInfo?.price_min || (event.is_free ? 0 : null);
        const priceMax = ticketInfo?.price_max;

        results.push({
          type: 'event',
          id: event.event_id,
          title: event.title,
          content: event.description,
          excerpt: event.short_description || event.description?.substring(0, 200) + '...',
          url: `${baseUrl}${eventUrl}`,
          images: event.main_image_url ? [event.main_image_url] : [],
          meta: {
            start_date: event.start_date?.toISOString(),
            end_date: event.end_date?.toISOString(),
            venue: venue?.name,
            place: venue?.place_slug,
            ticket_url: event.ticket_url_primary,
            price_min: priceMin,
            price_max: priceMax,
            is_free: event.is_free,
            urgency,
            days_until: daysUntil,
          }
        });
      }
    }

    return NextResponse.json({
      data: results,
      query: searchTerm,
      total: results.length,
    });

  } catch (error) {
    console.error('[Copiq Search API] Search failed:', error);
    return NextResponse.json(
      {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}
