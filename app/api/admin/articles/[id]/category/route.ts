import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const categoryId = body?.category_id as string | undefined;
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'category_id required' }, { status: 400 });
    }
    await sql`
      UPDATE article SET primary_category_id = ${categoryId}, updated_at = NOW()
      WHERE article_id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[article category]', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
