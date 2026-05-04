import { NextRequest, NextResponse } from 'next/server';
import { buildAutoWeeklyCampaign } from '@/lib/email-platform/auto-weekly/build-campaign';
import { buildAutoCampaignForNextSlot } from '@/lib/email-platform/auto-campaigns/build-one';
import type { AutoCampaignSelections, AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';

function parseSelectionOverride(body: Record<string, unknown>): AutoCampaignSelections | undefined {
  if (!body.selections || typeof body.selections !== 'object') return undefined;
  const selections = body.selections as Record<string, unknown>;
  return {
    brandHandle: typeof selections.brandHandle === 'string' && selections.brandHandle.trim()
      ? selections.brandHandle.trim()
      : null,
    categoryCollectionHandle:
      typeof selections.categoryCollectionHandle === 'string' && selections.categoryCollectionHandle.trim()
        ? selections.categoryCollectionHandle.trim()
        : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = typeof body?.type === 'string' ? (body.type as AutoCampaignType) : null;
    const selectionOverride = parseSelectionOverride(body);
    if (type && type !== 'brand' && type !== 'on_sale' && type !== 'category') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const scheduledAtRaw = typeof body?.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
    const scheduledAt =
      scheduledAtRaw.length > 0
        ? new Date(scheduledAtRaw)
        : undefined;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt datetime' }, { status: 400 });
    }
    if (type) {
      const single = await buildAutoCampaignForNextSlot({
        typeOverride: type,
        scheduledAtOverride: scheduledAt,
        sendApprovalEmail: true,
        selectionOverride,
      });
      return NextResponse.json({ ok: true, ...single });
    }
    const result = await buildAutoWeeklyCampaign({ scheduledAtOverride: scheduledAt, selectionOverride });
    return NextResponse.json({
      ok: true,
      approvalEmailSent: result.approvalEmailSent,
      results: result.results,
      campaignIds: result.results.map((r) => r.campaignId).filter(Boolean),
    });
  } catch (error) {
    console.error('[auto-campaigns run-build]', error);
    return NextResponse.json(
      { error: 'Build failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
