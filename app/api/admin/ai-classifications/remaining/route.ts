import { NextResponse } from 'next/server';
import { getRemainingToClassifyCount } from '@/lib/ai/classify-products-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const remaining = await getRemainingToClassifyCount();
    return NextResponse.json({ remaining });
  } catch (error) {
    console.error('Error fetching remaining count:', error);
    return NextResponse.json({ error: 'Failed to fetch remaining count' }, { status: 500 });
  }
}
