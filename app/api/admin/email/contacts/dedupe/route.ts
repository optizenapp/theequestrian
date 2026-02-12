import { NextRequest, NextResponse } from 'next/server';
import { runContactDedupe } from '@/lib/email-platform/dedupe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const result = await runContactDedupe({ dryRun });
    return NextResponse.json({ ok: true, dryRun, ...result });
  } catch (error) {
    console.error('Failed to run contact dedupe:', error);
    return NextResponse.json({ error: 'Failed to run contact dedupe' }, { status: 500 });
  }
}
