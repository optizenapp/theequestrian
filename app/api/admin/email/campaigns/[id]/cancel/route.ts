import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';

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
    if (status === 'completed' || status === 'failed') {
      return NextResponse.json(
        { error: `Cannot cancel campaign in ${status} status` },
        { status: 409 }
      );
    }

    await sql`
      UPDATE email_campaigns
      SET status = 'cancelled',
          failure_reason = 'cancelled_by_admin',
          completed_at = COALESCE(completed_at, NOW()),
          updated_at = NOW()
      WHERE id = ${id}
    `;

    const cancelledRecipients = await sql`
      UPDATE email_campaign_recipients
      SET status = 'cancelled',
          skip_reason = 'campaign_cancelled',
          updated_at = NOW()
      WHERE campaign_id = ${id}
        AND status = 'queued'
    `;

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_cancelled',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        name: String(campaign.name || ''),
        previousStatus: status,
        cancelledQueuedRecipients: Number(cancelledRecipients.rowCount || 0),
      },
    });

    return NextResponse.json({
      ok: true,
      id,
      cancelledQueuedRecipients: Number(cancelledRecipients.rowCount || 0),
    });
  } catch (error) {
    console.error('Failed to cancel campaign:', error);
    return NextResponse.json({ error: 'Failed to cancel campaign' }, { status: 500 });
  }
}
