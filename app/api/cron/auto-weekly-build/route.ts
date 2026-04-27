import { NextRequest, NextResponse } from 'next/server';
import { buildAutoWeeklyCampaign } from '@/lib/email-platform/auto-weekly/build-campaign';

export const dynamic = 'force-dynamic';

/**
 * Cron: build auto weekly email campaign (6pm AEST day before send).
 * Creates a campaign in pending_approval and emails jono@theequestrian.com.au for approval.
 * Schedule in vercel.json: 0 8 * * * (8am UTC ≈ 6pm AEST)
 */
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
      console.error('[auto-weekly-build] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    const token = authHeader?.replace('Bearer ', '');
    if (token !== envSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await buildAutoWeeklyCampaign();
    console.log('[auto-weekly-build] Result:', result);

    return NextResponse.json({
      ok: true,
      approvalEmailSent: result.approvalEmailSent,
      results: result.results.map((r) => ({
        ...r,
        scheduledAt: r.scheduledAt?.toISOString() ?? null,
      })),
      campaignIds: result.results.map((r) => r.campaignId).filter(Boolean),
    });
  } catch (error) {
    console.error('[auto-weekly-build] Failed:', error);
    return NextResponse.json(
      { error: 'Auto weekly build failed', details: String(error) },
      { status: 500 }
    );
  }
}
