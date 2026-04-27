import { NextRequest, NextResponse } from 'next/server';
import { releaseDueScheduledCampaigns } from '@/lib/email-platform/scheduled-release';

export const dynamic = 'force-dynamic';

/**
 * Cron: release scheduled campaigns. Finds campaigns with status=scheduled and scheduled_at <= now,
 * queues their recipients and sets status to processing. Existing email-campaigns cron then sends.
 * Schedule: every 5–15 min (e.g. every 10 min)
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
      console.error('[auto-weekly-release] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    const token = authHeader?.replace('Bearer ', '');
    if (token !== envSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const released = await releaseDueScheduledCampaigns({ windowHours: 1 });
    for (const r of released) {
      console.log('[auto-weekly-release] Released campaign', r.id, r.name, 'queued', r.queued);
    }

    return NextResponse.json({
      ok: true,
      released: released.length,
      campaigns: released,
    });
  } catch (error) {
    console.error('[auto-weekly-release] Failed:', error);
    return NextResponse.json(
      { error: 'Auto weekly release failed', details: String(error) },
      { status: 500 }
    );
  }
}
