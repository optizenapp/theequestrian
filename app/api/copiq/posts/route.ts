import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';
import { saveCopiqArticle, type CopiqArticle } from '@/lib/copiq-articles';
import { getArticleUrl } from '@/lib/articles';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      { status: 401 }
    );
  }

  try {
    const article = (await request.json()) as CopiqArticle;

    if (!article.id || !article.title || !article.content || !article.slug) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Missing required fields: id, title, content, slug' },
        { status: 400 }
      );
    }

    const savedArticle = await saveCopiqArticle(article);

    revalidatePath('/admin/articles');
    revalidatePath(`/admin/articles/${savedArticle.article_id}/edit`);

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(
      /\/+$/,
      ''
    );
    const articleUrl = getArticleUrl({ slug: savedArticle.slug });
    const fullUrl = articleUrl.startsWith('http') ? articleUrl : `${baseUrl}${articleUrl}`;

    return NextResponse.json({
      success: true,
      id: savedArticle.article_id,
      copiq_id: savedArticle.copiq_id,
      message:
        savedArticle.status === 'published'
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
