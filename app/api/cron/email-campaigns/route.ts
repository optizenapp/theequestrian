import { NextRequest, NextResponse } from 'next/server';
import { processCampaignQueues } from '@/lib/email-platform/campaign-worker';
import { releaseDueScheduledCampaigns } from '@/lib/email-platform/scheduled-release';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron endpoint to process email campaign queues.
 * Runs every 5 minutes via vercel.json crons config.
 * Safe to call repeatedly - will not re-send to already-sent recipients.
 */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    // Verify cron secret when configured. In environments where CRON_SECRET is
    // unset, still allow the request so jobs do not silently stop.
    const authHeader = request.headers.get('authorization');
    const headerSecret = request.headers.get('x-cron-secret');
    const envSecret = process.env.CRON_SECRET;

    if (envSecret) {
      const token = authHeader?.replace('Bearer ', '').trim();
      if (token !== envSecret && headerSecret?.trim() !== envSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Release due scheduled campaigns first so sending does not depend on a
    // separate release cron succeeding.
    const released = await releaseDueScheduledCampaigns({ windowHours: 24 });

    // Process campaign queues
    const result = await processCampaignQueues({ maxCampaigns: 5 });

    console.log('Campaign cron processed:', result);

    return NextResponse.json({
      ok: true,
      released: released.length,
      releasedCampaigns: released.map((c) => ({
        id: c.id,
        name: c.name,
        queued: c.queued,
      })),
      processed: result.processed,
      campaigns: result.campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        sent: c.result.sent,
        failed: c.result.failed,
        skipped: c.result.skipped,
        remainingQueued: c.after.queued,
        totalSent: c.after.sent,
      })),
    });
  } catch (error) {
    console.error('Campaign cron failed:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign queues' },
      { status: 500 }
    );
  }
}
