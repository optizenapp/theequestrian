import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { deleteCopiqArticle } from '@/lib/copiq-articles';
import { prisma } from '@/lib/prisma';
import { getArticleUrl } from '@/lib/articles';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/copiq/posts/[id]
 * 
 * URL verification endpoint for Copiq.
 * Returns the article's canonical URL and status so Copiq can verify
 * correct URLs before social publish callbacks.
 * 
 * The [id] parameter is the Yorkshire article_id (UUID), which Copiq
 * sends as externalArticleId in social publish callbacks.
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 * 
 * Returns:
 *   200: { success: true, id, url, status }
 *   401: { code: "UNAUTHORIZED", message: "Invalid API key" }
 *   404: { code: "NOT_FOUND", message: "Article not found" }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    // Try by article_id first, then by copiq_id
    const article = await prisma.article.findFirst({
      where: {
        OR: [
          { article_id: id },
          { copiq_id: id },
        ],
      },
      select: {
        article_id: true,
        slug: true,
        status: true,
        article_type: true,
        exclude_from_place_hubs: true,
        article_category: { select: { slug: true } },
        article_place: {
          select: { primary_place: true, place: { select: { slug: true } } },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Article not found', data: { status: 404 } },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.yorkshire.com';
    const relativePath = getArticleUrl(article);
    const url = `${baseUrl}${relativePath}`;

    return NextResponse.json({
      success: true,
      id: article.article_id,
      url,
      status: article.status,
    });
  } catch (error) {
    console.error('[Copiq API] Failed to get article:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to retrieve article' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/copiq/posts/[id]
 * 
 * Delete article by Copiq ID.
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 * 
 * URL Parameters:
 *   id: Copiq article ID
 * 
 * Returns:
 *   200: { success: true, message: "Article deleted successfully" }
 *   401: { code: "UNAUTHORIZED", message: "Invalid API key" }
 *   404: { code: "NOT_FOUND", message: "Article not found with copiq_id: ..." }
 *   500: { code: "DELETE_FAILED", message: "..." }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    await deleteCopiqArticle(id);

    // Revalidate cache
    revalidatePath('/admin/articles');

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
      copiq_id: id,
    });
  } catch (error) {
    console.error('[Copiq API] Failed to delete article:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete article';
    const isNotFound = errorMessage.includes('not found');
    
    return NextResponse.json(
      {
        code: isNotFound ? 'NOT_FOUND' : 'DELETE_FAILED',
        message: errorMessage,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
