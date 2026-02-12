import { NextRequest, NextResponse } from 'next/server';
import { evaluateSegmentMembership } from '@/lib/email-platform/segments';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await evaluateSegmentMembership(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to evaluate segment:', error);
    return NextResponse.json({ error: 'Failed to evaluate segment' }, { status: 500 });
  }
}
