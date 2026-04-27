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

    let campaignResult;
    try {
      campaignResult = await sql`
        SELECT id, name, status, metadata, created_by
        FROM email_campaigns
        WHERE id = ${id}
        LIMIT 1
      `;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!message.includes('created_by')) throw error;
      campaignResult = await sql`
        SELECT id, name, status, metadata
        FROM email_campaigns
        WHERE id = ${id}
        LIMIT 1
      `;
    }
    const campaign = campaignResult.rows[0];
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    const status = String(campaign.status || '');
    const createdBy = String(campaign.created_by || '');
    const isLegacyAutoDraft =
      status === 'draft' && (createdBy === 'auto-weekly' || createdBy === 'auto-campaign');

    const scheduledAtProvided = Object.prototype.hasOwnProperty.call(body || {}, 'scheduledAt');
    const scheduledAtRaw: unknown = body?.scheduledAt;
    let parsedScheduledAt: string | null | undefined;
    if (scheduledAtProvided) {
      if (scheduledAtRaw === null || scheduledAtRaw === '') {
        parsedScheduledAt = null;
      } else if (typeof scheduledAtRaw === 'string') {
        const dt = new Date(scheduledAtRaw);
        if (Number.isNaN(dt.getTime())) {
          return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 });
        }
        parsedScheduledAt = dt.toISOString();
      } else {
        return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 });
      }
    }

    // Schedule-only update path: change scheduled_at on draft / pending_approval /
    // scheduled campaigns without touching audience or recipients.
    const isScheduleOnlyUpdate =
      scheduledAtProvided &&
      body?.name === undefined &&
      body?.audience === undefined &&
      body?.metadata === undefined &&
      body?.templateVersionId === undefined;
    if (isScheduleOnlyUpdate) {
      if (
        status !== 'draft' &&
        status !== 'pending_approval' &&
        status !== 'scheduled'
      ) {
        return NextResponse.json(
          { error: 'Only pending_approval or scheduled campaigns can have their schedule updated' },
          { status: 409 }
        );
      }
      await sql`
        UPDATE email_campaigns
        SET scheduled_at = ${parsedScheduledAt}::timestamptz,
            updated_at = NOW()
        WHERE id = ${id}
      `;
      await logEmailAudit({
        actor: 'admin',
        action: 'campaign_schedule_updated',
        entityType: 'email_campaign',
        entityId: id,
        payload: {
          name: String(campaign.name || ''),
          scheduledAt: parsedScheduledAt,
          previousStatus: status,
        },
      });
      return NextResponse.json({ ok: true, id, scheduledAt: parsedScheduledAt });
    }

    if (status !== 'draft' && status !== 'pending_approval' && status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only draft, pending_approval, or cancelled campaigns can be edited' },
        { status: 409 }
      );
    }

    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : String(campaign.name || '');
    const templateVersionId = typeof body?.templateVersionId === 'string' ? body.templateVersionId : null;
    const listIds = Array.isArray(body?.audience?.listIds) ? body.audience.listIds.filter((v: unknown) => typeof v === 'string') : [];
    const segmentIds = Array.isArray(body?.audience?.segmentIds) ? body.audience.segmentIds.filter((v: unknown) => typeof v === 'string') : [];
    const audience = JSON.stringify({ listIds, segmentIds });
    const existingMetadata =
      campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
        ? (campaign.metadata as Record<string, unknown>)
        : {};
    let mergedMetadataJson: string | undefined;
    if (body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
      const incoming = body.metadata as Record<string, unknown>;
      mergedMetadataJson = JSON.stringify({ ...existingMetadata, ...incoming });
    }

    const nextStatus = status === 'cancelled' ? 'draft' : status;

    if (mergedMetadataJson !== undefined) {
      await sql`
        UPDATE email_campaigns
        SET
          name = ${name},
          template_version_id = COALESCE(${templateVersionId}, template_version_id),
          audience = ${audience}::jsonb,
          status = ${nextStatus},
          failure_reason = CASE WHEN ${status} = 'cancelled' THEN NULL ELSE failure_reason END,
          completed_at = CASE WHEN ${status} = 'cancelled' THEN NULL ELSE completed_at END,
          metadata = ${mergedMetadataJson}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE email_campaigns
        SET
          name = ${name},
          template_version_id = COALESCE(${templateVersionId}, template_version_id),
          audience = ${audience}::jsonb,
          status = ${nextStatus},
          failure_reason = CASE WHEN ${status} = 'cancelled' THEN NULL ELSE failure_reason END,
          completed_at = CASE WHEN ${status} = 'cancelled' THEN NULL ELSE completed_at END,
          updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    // Rebuild queued recipients whenever audience changes on a draft campaign.
    if (status === 'draft' && !isLegacyAutoDraft) {
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
        payload: {
          name,
          templateVersionId,
          listIds,
          segmentIds,
          queuedRecipients,
          audienceBreakdown,
          previousStatus: status,
          nextStatus: nextStatus,
        },
      });

      return NextResponse.json({ ok: true, id, queuedRecipients, audienceBreakdown });
    }

    // For cancelled campaigns, only continue sending to previously unsent recipients.
    // Do not rebuild audience and do not requeue sent/delivered/failed rows.
    if (status === 'cancelled') {
      const reactivated = await sql`
        UPDATE email_campaign_recipients
        SET status = 'queued',
            skip_reason = NULL,
            updated_at = NOW()
        WHERE campaign_id = ${id}
          AND status IN ('cancelled', 'scheduled', 'queued')
      `;

      const queuedCountResult = await sql`
        SELECT COUNT(*) AS queued_count
        FROM email_campaign_recipients
        WHERE campaign_id = ${id}
          AND status = 'queued'
      `;
      const queuedRecipients = Number(queuedCountResult.rows[0]?.queued_count || 0);
      const audienceBreakdown = await getAudienceBreakdown({ listIds, segmentIds });

      await logEmailAudit({
        actor: 'admin',
        action: 'campaign_reactivated',
        entityType: 'email_campaign',
        entityId: id,
        payload: {
          name,
          templateVersionId,
          listIds,
          segmentIds,
          reactivatedRecipients: Number(reactivated.rowCount || 0),
          queuedRecipients,
          audienceBreakdown,
          previousStatus: status,
          nextStatus: nextStatus,
        },
      });

      return NextResponse.json({
        ok: true,
        id,
        reactivatedRecipients: Number(reactivated.rowCount || 0),
        queuedRecipients,
        audienceBreakdown,
      });
    }

    const audienceBreakdown = await getAudienceBreakdown({ listIds, segmentIds });
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_updated',
      entityType: 'email_campaign',
      entityId: id,
      payload: { name, templateVersionId, listIds, segmentIds, audienceBreakdown },
    });
    return NextResponse.json({ ok: true, id, audienceBreakdown });
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
        status: String(campaign.status || ''),
        deletedRecipientCount: recipientCount,
      },
    });

    return NextResponse.json({ ok: true, deletedRecipientCount: recipientCount });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
