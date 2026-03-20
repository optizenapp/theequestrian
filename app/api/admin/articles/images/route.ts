import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { listArticleImages } from '@/lib/s3/storage';

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const images = await listArticleImages('articles/', 200);
    return NextResponse.json({ images });
  } catch (error) {
    console.error('[articles/images]', error);
    return NextResponse.json(
      { error: 'Failed to list images' },
      { status: 500 }
    );
  }
}
