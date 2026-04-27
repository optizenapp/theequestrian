import { NextRequest, NextResponse } from 'next/server';
import { processAutoCampaignResends } from '@/lib/email-platform/auto-campaigns/resend-non-openers';

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
      console.error('[auto-campaign-resend] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    const token = authHeader?.replace('Bearer ', '');
    if (token !== envSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processAutoCampaignResends();
    console.log('[auto-campaign-resend] Result:', result);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[auto-campaign-resend] Failed:', error);
    return NextResponse.json(
      { error: 'Auto campaign resend failed', details: String(error) },
      { status: 500 }
    );
  }
}
