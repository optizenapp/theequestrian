import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';

/**
 * Pause a pending_approval or scheduled campaign by setting metadata.paused=true.
 * The release cron skips campaigns where metadata.paused is true.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaignResult = await sql`
      SELECT id, name, status, metadata
      FROM email_campaigns
      WHERE id = ${id}
      LIMIT 1
    `;
    const campaign = campaignResult.rows[0];
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const status = String(campaign.status || '');
    if (
      status !== 'draft' &&
      status !== 'pending_approval' &&
      status !== 'scheduled'
    ) {
      return NextResponse.json(
        { error: `Cannot pause campaign in ${status} status` },
        { status: 409 }
      );
    }

    const existingMetadata =
      campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
        ? (campaign.metadata as Record<string, unknown>)
        : {};
    const mergedMetadata = JSON.stringify({
      ...existingMetadata,
      paused: true,
      pausedAt: new Date().toISOString(),
    });

    await sql`
      UPDATE email_campaigns
      SET metadata = ${mergedMetadata}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
    `;

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_paused',
      entityType: 'email_campaign',
      entityId: id,
      payload: { name: String(campaign.name || ''), previousStatus: status },
    });

    return NextResponse.json({ ok: true, id, paused: true });
  } catch (error) {
    console.error('Failed to pause campaign:', error);
    return NextResponse.json({ error: 'Failed to pause campaign' }, { status: 500 });
  }
}
