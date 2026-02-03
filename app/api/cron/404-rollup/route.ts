import { NextResponse } from 'next/server';
import { rollupNotFoundEvents } from '@/lib/not-found/rollup';

export async function GET() {
  try {
    const days = await rollupNotFoundEvents(30);
    return NextResponse.json({ ok: true, days });
  } catch (error) {
    console.error('Cron 404 rollup error:', error);
    return NextResponse.json({ error: 'Failed to roll up 404s' }, { status: 500 });
  }
}
