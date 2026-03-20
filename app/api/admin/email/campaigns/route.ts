import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getAudienceBreakdown, getResolvedAudienceContactIds } from '@/lib/email-platform/segments';
import { queueCampaignRecipients } from '@/lib/email-platform/sending';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { getProductUsageForCampaign } from '@/lib/email-platform/auto-weekly/used-products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 1000);
    const result = await sql`
      SELECT id, name, status, template_version_id, audience, scheduled_at, started_at, completed_at, metadata, updated_at, created_by
      FROM email_campaigns
      ORDER BY (created_by = 'auto-weekly') DESC, updated_at DESC
      LIMIT ${limit}
    `;

    const campaigns = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      templateVersionId: (row.template_version_id as string | null) ?? null,
      audience: (row.audience as Record<string, unknown>) || {},
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at as string).toISOString() : null,
      startedAt: row.started_at ? new Date(row.started_at as string).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at as string).toISOString() : null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      updatedAt: new Date(row.updated_at as string).toISOString(),
      createdBy: (row.created_by as string | null) ?? null,
    }));

    // For pending_approval auto campaigns, attach product usage (previous campaigns that used each product)
    const pendingAuto = campaigns.filter(
      (c) => c.status === 'pending_approval' && c.createdBy === 'auto-weekly'
    );
    const productHandlesByCampaign = pendingAuto.map((c) => {
      const handles = c.metadata?.productHandles;
      return {
        id: c.id,
        scheduledAt: c.scheduledAt,
        handles: Array.isArray(handles) ? (handles as unknown[]).filter((h): h is string => typeof h === 'string') : [],
      };
    });

    const productUsageByCampaignId: Record<string, Record<string, { campaignName: string; scheduledAt: string }[]>> = {};
    await Promise.all(
      productHandlesByCampaign.map(async ({ id, scheduledAt, handles }) => {
        if (handles.length === 0) return;
        const usage = await getProductUsageForCampaign(id, handles, scheduledAt);
        productUsageByCampaignId[id] = usage;
      })
    );

    const campaignsWithUsage = campaigns.map((c) => {
      const productUsage = productUsageByCampaignId[c.id];
      if (!productUsage) return c;
      return { ...c, productUsage };
    });

    return NextResponse.json({
      campaigns: campaignsWithUsage,
    });
  } catch (error) {
    console.error('Failed to load campaigns:', error);
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const templateVersionId =
      typeof body?.templateVersionId === 'string' ? body.templateVersionId.trim() : '';
    const audience = typeof body?.audience === 'object' && body.audience ? body.audience : {};
    const listIds = Array.isArray((audience as { listIds?: unknown }).listIds)
      ? ((audience as { listIds: unknown[] }).listIds.filter(
          (value): value is string => typeof value === 'string'
        ) as string[])
      : [];
    const segmentIds = Array.isArray((audience as { segmentIds?: unknown }).segmentIds)
      ? ((audience as { segmentIds: unknown[] }).segmentIds.filter(
          (value): value is string => typeof value === 'string'
        ) as string[])
      : [];

    if (!name || !templateVersionId) {
      return NextResponse.json({ error: 'name and templateVersionId are required' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO email_campaigns (
        name,
        status,
        template_version_id,
        audience,
        scheduled_at,
        created_by,
        updated_at
      )
      VALUES (
        ${name},
        ${body?.scheduledAt ? 'scheduled' : 'draft'},
        ${templateVersionId},
        ${JSON.stringify({ listIds, segmentIds })},
        ${body?.scheduledAt || null},
        'admin',
        NOW()
      )
      RETURNING id
    `;
    const campaignId = inserted.rows[0]?.id as string;

    const audienceBreakdown = await getAudienceBreakdown({ listIds, segmentIds });
    const contactIds = await getResolvedAudienceContactIds({ listIds, segmentIds });
    const queued = await queueCampaignRecipients(campaignId, contactIds);
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_created',
      entityType: 'email_campaign',
      entityId: campaignId,
      payload: {
        name,
        templateVersionId,
        audience: { listIds, segmentIds },
        queued,
        audienceBreakdown,
      },
    });

    return NextResponse.json({
      ok: true,
      id: campaignId,
      queuedRecipients: queued,
      audienceBreakdown,
    });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
