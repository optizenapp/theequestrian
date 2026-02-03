import { NextResponse } from 'next/server';
import { recomputeRollupSuggestions } from '@/lib/not-found/rollup-store';

export async function POST() {
  try {
    const result = await recomputeRollupSuggestions(500);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('404 suggestion refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh suggestions' }, { status: 500 });
  }
}
