import { NextRequest, NextResponse } from 'next/server';
import { processCampaignQueues } from '@/lib/email-platform/campaign-worker';

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
    // Verify this is a legitimate Vercel cron request
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
    const envSecret = process.env.CRON_SECRET;

    if (!envSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    // Vercel sends this header automatically when cron triggers
    if (vercelCronSecret !== envSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process campaign queues
    const result = await processCampaignQueues({
      maxCampaigns: 5,
      frequencyCapCount: 3,
      frequencyCapDays: 7,
    });

    console.log('Campaign cron processed:', result);

    return NextResponse.json({
      ok: true,
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
