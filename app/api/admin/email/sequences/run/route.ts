import { NextRequest, NextResponse } from 'next/server';
import { runDueSequenceEnrollments } from '@/lib/email-platform/sequences';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit || 200), 1), 5000);
    const result = await runDueSequenceEnrollments(limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to run sequence engine:', error);
    return NextResponse.json({ error: 'Failed to run sequence engine' }, { status: 500 });
  }
}
