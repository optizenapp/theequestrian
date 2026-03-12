import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { saveCopiqArticle, CopiqArticle } from '@/lib/copiq-articles';
import { getArticleUrl } from '@/lib/articles';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/copiq/posts
 * 
 * Create or update article from Copiq.
 * Uses upsert logic based on copiq_id - if article exists, it updates; otherwise creates new.
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 *   Content-Type: application/json
 * 
 * Body:
 *   {
 *     id: string,              // Copiq's unique ID (required)
 *     title: string,           // Article title (required)
 *     content: string,         // HTML content (required)
 *     slug: string,            // URL slug (required)
 *     excerpt?: string,        // Short description
 *     status: 'draft' | 'publish' | 'future',
 *     image?: string,          // Base64 encoded image
 *     seoTitle?: string,       // SEO title
 *     keywords?: string,       // SEO keywords
 *     post_date?: string,      // ISO 8601 date
 *     meta?: {
 *       article_type?: string,
 *       category_slug?: string,
 *       primary_place_slug?: string,
 *       author_name?: string,
 *       exclude_from_place_hubs?: boolean,
 *       pr_contacts?: string         // Comma-separated PR emails for publish notification
 *     }
 *   }
 * 
 * Returns:
 *   200: { success: true, id: "...", copiq_id: "...", message: "...", url: "..." }
 *   400: { code: "VALIDATION_ERROR", message: "..." }
 *   401: { code: "UNAUTHORIZED", message: "Invalid API key" }
 *   500: { code: "CREATE_FAILED", message: "..." }
 */
export async function POST(request: NextRequest) {
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
    const article: CopiqArticle = await request.json();

    // Validate required fields
    if (!article.id || !article.title || !article.content || !article.slug) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: id, title, content, slug',
        },
        { status: 400 }
      );
    }

    // Save article (upsert by copiq_id)
    const savedArticle = await saveCopiqArticle(article);

    // Revalidate cache for admin pages
    revalidatePath('/admin/articles');
    revalidatePath(`/admin/articles/${savedArticle.article_id}/edit`);

    // Generate article URL for the response
    const articleUrl = getArticleUrl({
      slug: savedArticle.slug,
      article_type: savedArticle.article_type,
      exclude_from_place_hubs: savedArticle.exclude_from_place_hubs,
      article_category: savedArticle.primary_category_id
        ? { slug: article.meta?.category_slug || 'uncategorized' }
        : null,
      article_place: [], // Will be populated by getArticleUrl if place is linked
    });

    const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yorkshire.com'}${articleUrl}`;

    return NextResponse.json({
      success: true,
      id: savedArticle.article_id,
      copiq_id: savedArticle.copiq_id,
      message: savedArticle.status === 'published' 
        ? 'Article published successfully' 
        : 'Article saved as draft',
      url: fullUrl,
      status: savedArticle.status,
    });
  } catch (error) {
    console.error('[Copiq API] Failed to save article:', error);
    return NextResponse.json(
      {
        code: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create article',
      },
      { status: 500 }
    );
  }
}
