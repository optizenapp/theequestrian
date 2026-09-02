import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { sendQueuedCampaignRecipients } from '@/lib/email-platform/sending';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaignResult = await sql`
      SELECT id, name, status
      FROM email_campaigns
      WHERE id = ${id}
      LIMIT 1
    `;
    const campaign = campaignResult.rows[0];
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const status = String(campaign.status || '');
    if (status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed campaigns can resend unsent recipients' },
        { status: 409 }
      );
    }

    const pendingResult = await sql`
      SELECT COUNT(*)::int AS pending
      FROM email_campaign_recipients
      WHERE campaign_id = ${id}
        AND status IN ('skipped', 'failed', 'cancelled', 'scheduled', 'queued')
    `;
    const pending = Number(pendingResult.rows[0]?.pending || 0);
    if (pending === 0) {
      return NextResponse.json(
        { error: 'No unsent recipients to resend (only sent/delivered remain)' },
        { status: 409 }
      );
    }

    await sql`
      UPDATE email_campaigns
      SET status = 'processing',
          completed_at = NULL,
          updated_at = NOW()
      WHERE id = ${id}
    `;

    const requeued = await sql`
      UPDATE email_campaign_recipients
      SET status = 'queued',
          skip_reason = NULL,
          updated_at = NOW()
      WHERE campaign_id = ${id}
        AND status IN ('skipped', 'failed', 'cancelled', 'scheduled', 'queued')
    `;
    const requeuedRecipients = Number(requeued.rowCount || 0);

    const sendResult = await sendQueuedCampaignRecipients({ campaignId: id });

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_resend_unsent',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        name: String(campaign.name || ''),
        requeuedRecipients,
        resendableStatuses: ['skipped', 'failed', 'cancelled', 'scheduled', 'queued'],
        ...sendResult,
      },
    });

    return NextResponse.json({
      ok: true,
      id,
      requeuedRecipients,
      ...sendResult,
    });
  } catch (error) {
    console.error('Failed to resend unsent campaign recipients:', error);
    return NextResponse.json({ error: 'Failed to resend unsent recipients' }, { status: 500 });
  }
}
