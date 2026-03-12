import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/articles/db';

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[admin categories]', error);
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
