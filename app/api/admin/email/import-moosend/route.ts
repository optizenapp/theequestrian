import { NextRequest, NextResponse } from 'next/server';
import { importMoosendListsAndSubscribers } from '@/lib/email-platform/moosend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const listId = typeof body?.listId === 'string' ? body.listId : undefined;
    const maxLists = Number.isFinite(Number(body?.maxLists)) ? Number(body.maxLists) : undefined;

    const result = await importMoosendListsAndSubscribers({ listId, maxLists });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to import Moosend lists/subscribers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import Moosend data' },
      { status: 500 }
    );
  }
}
