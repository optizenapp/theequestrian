import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { sql } from '@/lib/db/client';
import { getArticleUrl } from '@/lib/articles';

type ArticleSearchRow = {
  article_id: unknown;
  title: unknown;
  slug: unknown;
  excerpt: unknown;
  content: unknown;
  featured_image_url: unknown;
  article_type: unknown;
  published_at: unknown;
  exclude_from_place_hubs: unknown;
  cat_slug: unknown;
  cat_name: unknown;
};

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const typeFilter = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required and must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    const searchTerm = `%${query.trim()}%`;
    const results: Array<Record<string, unknown>> = [];
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au').replace(
      /\/+$/,
      ''
    );

    if (!typeFilter || typeFilter === 'article') {
      const rows = await sql`
        SELECT a.article_id, a.title, a.slug, a.excerpt, a.content, a.featured_image_url,
               a.article_type, a.published_at, a.exclude_from_place_hubs,
               c.slug AS cat_slug, c.name AS cat_name
        FROM article a
        LEFT JOIN article_category c ON c.category_id = a.primary_category_id
        WHERE a.status IN ('published', 'publish')
        AND (a.title ILIKE ${searchTerm} OR a.excerpt ILIKE ${searchTerm} OR a.content ILIKE ${searchTerm})
        ORDER BY a.published_at DESC NULLS LAST
        LIMIT ${limit}
      `;
      const articles = (Array.isArray(rows) ? rows : []) as ArticleSearchRow[];
      for (const art of articles) {
        const url = getArticleUrl({ slug: art.slug as string });
        results.push({
          type: 'article',
          id: art.article_id,
          title: art.title,
          content: art.content,
          excerpt: art.excerpt || String(art.content).slice(0, 200) + '...',
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
          images: art.featured_image_url ? [art.featured_image_url] : [],
          date: art.published_at,
          meta: {
            article_type: art.article_type,
            category: art.cat_name,
            place: null,
          },
        });
      }
    }

    return NextResponse.json({
      data: results,
      query: query.trim(),
      total: results.length,
    });
  } catch (error) {
    console.error('[Copiq Search API]', error);
    return NextResponse.json(
      {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}
