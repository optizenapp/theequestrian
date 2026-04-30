import { NextRequest, NextResponse } from 'next/server';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import {
  loadCampaignVideoRow,
  resolveCampaignSubjectLine,
} from '@/lib/email-platform/videos/campaign-video-context';
import { buildValidatedSlideCopy } from '@/lib/email-platform/videos/copy-service';
import {
  loadCopyProductTitles,
  resolveCopyContext,
} from '@/lib/email-platform/videos/copy-context-resolver';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    await ensureEmailPlatformSchema();
    const id = String((await params).id || '');
    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    }
    const campaign = await loadCampaignVideoRow(id);
    const subjectLine = resolveCampaignSubjectLine(campaign);
    if (!subjectLine) {
      return NextResponse.json({ error: 'Subject line required to preview slide copy' }, { status: 400 });
    }
    const context = resolveCopyContext(campaign, subjectLine);
    const productTitles = await loadCopyProductTitles(campaign);
    const result = await buildValidatedSlideCopy({ ...context, productTitles });
    return NextResponse.json({
      ok: true,
      campaignId: id,
      campaignName: campaign.name,
      variant: context.variant,
      source: result.source,
      rejectionReason: result.rejectionReason || null,
      context: { ...context, productTitles },
      slideCopy: result.copy,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview slide copy' },
      { status: 500 }
    );
  }
}
