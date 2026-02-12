import { NextRequest, NextResponse } from 'next/server';
import { enrollContactInSequence } from '@/lib/email-platform/sequences';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const contactId = typeof body?.contactId === 'string' ? body.contactId : '';
    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    const result = await enrollContactInSequence({
      sequenceId: id,
      contactId,
      metadata: typeof body?.metadata === 'object' && body.metadata ? body.metadata : {},
    });
    if (!result) {
      return NextResponse.json({ error: 'Sequence is not enrollable' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to enroll contact in sequence:', error);
    return NextResponse.json({ error: 'Failed to enroll contact in sequence' }, { status: 500 });
  }
}
