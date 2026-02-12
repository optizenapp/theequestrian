import { NextRequest, NextResponse } from 'next/server';
import { cancelScheduledReviewEmailById } from '@/lib/reviews/review-email-cancellation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailSendId = typeof body?.emailSendId === 'string' ? body.emailSendId.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Manual admin cancel';

    if (!emailSendId) {
      return NextResponse.json({ error: 'Missing emailSendId' }, { status: 400 });
    }

    const result = await cancelScheduledReviewEmailById(emailSendId, reason);
    if (!result) {
      return NextResponse.json(
        { error: 'Scheduled email not found or already processed' },
        { status: 404 }
      );
    }

    if (!result.cancelled) {
      return NextResponse.json(
        {
          error: 'Failed to cancel scheduled email',
          details: result.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error('Failed to cancel scheduled review email:', error);
    return NextResponse.json({ error: 'Failed to cancel scheduled review email' }, { status: 500 });
  }
}
