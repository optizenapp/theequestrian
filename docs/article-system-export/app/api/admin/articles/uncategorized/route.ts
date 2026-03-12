import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Find the "Uncategorized" category
    const uncategorizedCategory = await prisma.article_category.findFirst({
      where: {
        OR: [
          { slug: 'uncategorized' },
          { name: { contains: 'Uncategorized', mode: 'insensitive' } }
        ]
      }
    });

    if (!uncategorizedCategory) {
      return NextResponse.json({ success: true, articles: [] });
    }

    // Fetch articles in the uncategorized category
    const articles = await prisma.article.findMany({
      where: {
        primary_category_id: uncategorizedCategory.category_id,
        article_type: {
          in: ['news', 'inspiration', 'history', 'guide', 'route']
        }
      },
      select: {
        article_id: true,
        slug: true,
        title: true,
        excerpt: true,
        article_type: true,
        published_at: true
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    return NextResponse.json({ success: true, articles });
  } catch (error) {
    console.error('Error fetching uncategorized articles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

