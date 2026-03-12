import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category_id } = body;

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: 'category_id is required' },
        { status: 400 }
      );
    }

    // Update the article's primary category
    await prisma.article.update({
      where: { article_id: id },
      data: {
        primary_category_id: category_id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating article category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

