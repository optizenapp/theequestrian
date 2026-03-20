import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getResolvedAudienceContactIds } from '@/lib/email-platform/segments';
import { queueCampaignRecipients } from '@/lib/email-platform/sending';

export const dynamic = 'force-dynamic';

/**
 * Cron: release scheduled campaigns. Finds campaigns with status=scheduled and scheduled_at <= now,
 * queues their recipients and sets status to processing. Existing email-campaigns cron then sends.
 * Schedule: every 5–15 min (e.g. */10 * * * *)
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

    const due = await sql`
      SELECT id, name, audience, scheduled_at
      FROM email_campaigns
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()
        AND scheduled_at > NOW() - INTERVAL '1 hour'
    `;

    const released: Array<{ id: string; name: string; queued: number }> = [];

    for (const row of due.rows) {
      const campaignId = row.id as string;
      const name = row.name as string;
      const audience = (row.audience as { listIds?: string[]; segmentIds?: string[] }) || {};
      const listIds = audience.listIds || [];
      const segmentIds = audience.segmentIds || [];

      const contactIds = await getResolvedAudienceContactIds({ listIds, segmentIds });
      const queued = await queueCampaignRecipients(campaignId, contactIds);

      await sql`
        UPDATE email_campaigns
        SET status = 'processing',
            updated_at = NOW()
        WHERE id = ${campaignId}
      `;

      released.push({ id: campaignId, name, queued });
      console.log('[auto-weekly-release] Released campaign', campaignId, name, 'queued', queued);
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
