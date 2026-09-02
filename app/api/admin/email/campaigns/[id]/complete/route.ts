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
    if (status === 'completed') {
      return NextResponse.json({ ok: true, id, message: 'Already completed' });
    }
    if (status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot complete a cancelled campaign' },
        { status: 409 }
      );
    }

    // Check if there are any remaining queued recipients
    const queuedCheck = await sql`
      SELECT COUNT(*) AS queued_count
      FROM email_campaign_recipients
      WHERE campaign_id = ${id}
        AND status = 'queued'
    `;
    const queuedCount = Number(queuedCheck.rows[0]?.queued_count || 0);

    if (queuedCount > 0) {
      return NextResponse.json(
        { error: `Cannot complete: ${queuedCount} recipients still queued` },
        { status: 409 }
      );
    }

    await sql`
      UPDATE email_campaigns
      SET status = 'completed',
          completed_at = COALESCE(completed_at, NOW()),
          updated_at = NOW()
      WHERE id = ${id}
    `;

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_completed',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        name: String(campaign.name || ''),
        previousStatus: status,
      },
    });

    return NextResponse.json({
      ok: true,
      id,
      previousStatus: status,
      message: 'Campaign marked as completed',
    });
  } catch (error) {
    console.error('Failed to complete campaign:', error);
    return NextResponse.json({ error: 'Failed to complete campaign' }, { status: 500 });
  }
}
