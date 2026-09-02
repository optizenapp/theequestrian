import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import {
  loadCampaignVideoRow,
  resolveCampaignSubjectLine,
} from '@/lib/email-platform/videos/campaign-video-context';
import { resolveCopyContext } from '@/lib/email-platform/videos/copy-context-resolver';
import { validateAndSanitizeSlideCopy } from '@/lib/email-platform/videos/copy-validation';
import { getSlideCopyOverride } from '@/lib/email-platform/videos/slide-copy-override';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function resolveContext(id: string) {
  const campaign = await loadCampaignVideoRow(id);
  const subjectLine = resolveCampaignSubjectLine(campaign);
  if (!subjectLine) {
    return { error: 'Subject line required to manage slide copy', status: 400 as const };
  }
  return { campaign, context: resolveCopyContext(campaign, subjectLine) };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    await ensureEmailPlatformSchema();
    const id = String((await params).id || '');
    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    const resolved = await resolveContext(id);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const saved = getSlideCopyOverride(resolved.campaign.metadata);
    return NextResponse.json({
      ok: true,
      campaignId: id,
      variant: resolved.context.variant,
      context: resolved.context,
      saved: saved ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load slide copy' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    await ensureEmailPlatformSchema();
    const id = String((await params).id || '');
    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    const resolved = await resolveContext(id);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const body = (await request.json()) as { slideCopy?: unknown };
    const validated = validateAndSanitizeSlideCopy(body?.slideCopy, resolved.context);
    if (!validated.ok) {
      return NextResponse.json({ error: `Invalid slide copy: ${validated.reason}` }, { status: 400 });
    }
    const existingMetadata =
      resolved.campaign.metadata && typeof resolved.campaign.metadata === 'object'
        ? resolved.campaign.metadata
        : {};
    const merged = JSON.stringify({ ...existingMetadata, slideCopyOverride: validated.copy });
    await sql`
      UPDATE email_campaigns
      SET metadata = ${merged}::jsonb, updated_at = NOW()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true, saved: validated.copy });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save slide copy' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    await ensureEmailPlatformSchema();
    const id = String((await params).id || '');
    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    const campaign = await loadCampaignVideoRow(id);
    const existingMetadata =
      campaign.metadata && typeof campaign.metadata === 'object' ? { ...campaign.metadata } : {};
    delete existingMetadata.slideCopyOverride;
    const merged = JSON.stringify(existingMetadata);
    await sql`
      UPDATE email_campaigns
      SET metadata = ${merged}::jsonb, updated_at = NOW()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear slide copy' },
      { status: 500 }
    );
  }
}
