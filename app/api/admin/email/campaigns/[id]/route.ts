import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';

export async function DELETE(
  _request: NextRequest,
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
    if (status !== 'draft' && status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only draft or scheduled campaigns can be deleted' },
        { status: 409 }
      );
    }

    const sentRecipientCountResult = await sql`
      SELECT COUNT(*) AS count
      FROM email_campaign_recipients
      WHERE campaign_id = ${id}
        AND status IN ('sent', 'delivered', 'failed')
    `;
    const sentRecipientCount = Number(sentRecipientCountResult.rows[0]?.count || 0);
    if (sentRecipientCount > 0) {
      return NextResponse.json(
        { error: 'Campaign cannot be deleted after send processing has started' },
        { status: 409 }
      );
    }

    const recipientCountResult = await sql`
      SELECT COUNT(*) AS count
      FROM email_campaign_recipients
      WHERE campaign_id = ${id}
    `;
    const recipientCount = Number(recipientCountResult.rows[0]?.count || 0);

    await sql`
      DELETE FROM email_campaigns
      WHERE id = ${id}
    `;

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_deleted',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        name: String(campaign.name || ''),
        status,
        deletedRecipientCount: recipientCount,
      },
    });

    return NextResponse.json({ ok: true, deletedRecipientCount: recipientCount });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
