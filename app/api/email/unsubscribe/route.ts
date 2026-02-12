import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const result = await sql`
      UPDATE email_subscriptions
      SET status = 'unsubscribed',
          unsubscribed_at = NOW(),
          updated_at = NOW()
      WHERE unsubscribe_token::TEXT = ${token}
      RETURNING contact_id
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'You have been unsubscribed.' });
  } catch (error) {
    console.error('Failed to unsubscribe contact:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe contact' }, { status: 500 });
  }
}
