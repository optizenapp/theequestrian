import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';

/**
 * Approve a pending_approval campaign: set status to scheduled.
 * Recipients are not queued here; the release cron does that at scheduled_at.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaignResult = await sql`
      SELECT id, name, status, scheduled_at
      FROM email_campaigns
      WHERE id = ${id}
      LIMIT 1
    `;
    const campaign = campaignResult.rows[0];
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (String(campaign.status) !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Only pending_approval campaigns can be approved' },
        { status: 409 }
      );
    }

    await sql`
      UPDATE email_campaigns
      SET status = 'scheduled',
          updated_at = NOW()
      WHERE id = ${id}
    `;

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_approved',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        name: String(campaign.name),
        scheduledAt: campaign.scheduled_at ? new Date(campaign.scheduled_at as string).toISOString() : null,
      },
    });

    return NextResponse.json({
      ok: true,
      id,
      message: 'Campaign approved. It will be sent at the scheduled time.',
    });
  } catch (error) {
    console.error('Failed to approve campaign:', error);
    return NextResponse.json({ error: 'Failed to approve campaign' }, { status: 500 });
  }
}
