import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueReviewEmails } from '@/lib/reviews/dispatch-scheduled-review-emails';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const envSecret = process.env.CRON_SECRET;

    if (!envSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    const token = authHeader?.replace('Bearer ', '');
    if (token !== envSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dispatchDueReviewEmails({ limit: 50 });
    console.log('Review email cron:', result);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Review email cron failed:', error);
    return NextResponse.json({ error: 'Failed to dispatch review emails' }, { status: 500 });
  }
}
