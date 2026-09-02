import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';

/**
 * Resume a previously paused campaign by clearing metadata.paused.
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

    const existingMetadata =
      campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
        ? (campaign.metadata as Record<string, unknown>)
        : {};
    const nextMetadata: Record<string, unknown> = { ...existingMetadata };
    delete nextMetadata.paused;
    delete nextMetadata.pausedAt;
    const mergedMetadata = JSON.stringify(nextMetadata);

    await sql`
      UPDATE email_campaigns
      SET metadata = ${mergedMetadata}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
    `;

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_resumed',
      entityType: 'email_campaign',
      entityId: id,
      payload: { name: String(campaign.name || ''), status: String(campaign.status || '') },
    });

    return NextResponse.json({ ok: true, id, paused: false });
  } catch (error) {
    console.error('Failed to resume campaign:', error);
    return NextResponse.json({ error: 'Failed to resume campaign' }, { status: 500 });
  }
}
