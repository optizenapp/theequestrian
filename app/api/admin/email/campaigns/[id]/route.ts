import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { getAudienceBreakdown, getResolvedAudienceContactIds } from '@/lib/email-platform/segments';
import { queueCampaignRecipients } from '@/lib/email-platform/sending';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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
    if (String(campaign.status || '') !== 'draft') {
      return NextResponse.json({ error: 'Only draft campaigns can be edited' }, { status: 409 });
    }

    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : String(campaign.name || '');
    const templateVersionId = typeof body?.templateVersionId === 'string' ? body.templateVersionId : null;
    const listIds = Array.isArray(body?.audience?.listIds) ? body.audience.listIds.filter((v: unknown) => typeof v === 'string') : [];
    const segmentIds = Array.isArray(body?.audience?.segmentIds) ? body.audience.segmentIds.filter((v: unknown) => typeof v === 'string') : [];
    const audience = JSON.stringify({ listIds, segmentIds });

    await sql`
      UPDATE email_campaigns
      SET
        name = ${name},
        template_version_id = ${templateVersionId},
        audience = ${audience}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Rebuild queued recipients whenever audience changes on a draft campaign.
    // This prevents stale recipients from previous list/segment selections.
    await sql`
      DELETE FROM email_campaign_recipients
      WHERE campaign_id = ${id}
    `;

    const audienceBreakdown = await getAudienceBreakdown({ listIds, segmentIds });
    const contactIds = await getResolvedAudienceContactIds({ listIds, segmentIds });
    const queuedRecipients = await queueCampaignRecipients(id, contactIds);

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_updated',
      entityType: 'email_campaign',
      entityId: id,
      payload: { name, templateVersionId, listIds, segmentIds, queuedRecipients, audienceBreakdown },
    });

    return NextResponse.json({ ok: true, id, queuedRecipients, audienceBreakdown });
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

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

    // All campaign statuses can be deleted - no restrictions
    // This allows cleaning up completed, cancelled, draft, etc.

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
