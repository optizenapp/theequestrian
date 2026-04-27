import { NextRequest, NextResponse } from 'next/server';
import { buildAutoWeeklyCampaign } from '@/lib/email-platform/auto-weekly/build-campaign';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const scheduledAtRaw = typeof body?.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
    const scheduledAt =
      scheduledAtRaw.length > 0
        ? new Date(scheduledAtRaw)
        : undefined;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt datetime' }, { status: 400 });
    }
    const result = await buildAutoWeeklyCampaign({ scheduledAtOverride: scheduledAt });
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
