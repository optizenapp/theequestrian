import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { deleteCopiqArticle } from '@/lib/copiq-articles';
import { getArticleById, getArticleByCopiqId } from '@/lib/articles/db';
import { getArticleUrl } from '@/lib/articles';
import { revalidatePath } from 'next/cache';

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
    const byId = await getArticleById(id);
    const byCopiqId = byId ? null : await getArticleByCopiqId(id);
    const article = byId ?? byCopiqId;

    if (!article) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Article not found', data: { status: 404 } },
        { status: 404 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au').replace(
      /\/+$/,
      ''
    );
    const relativePath = getArticleUrl(article);
    const url = relativePath.startsWith('http') ? relativePath : `${baseUrl}${relativePath}`;

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

export async function DELETE(
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
    await deleteCopiqArticle(id);
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
