import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/email-platform/unsubscribe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const result = await unsubscribeByToken(token);
    if (!result) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: 'You have been unsubscribed and moved to the Unsubscribed list.',
      contactId: result.contactId,
    });
  } catch (error) {
    console.error('Failed to unsubscribe contact:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe contact' }, { status: 500 });
  }
}
