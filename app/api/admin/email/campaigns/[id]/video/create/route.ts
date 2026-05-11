import { NextRequest, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { enqueueCampaignVideoJob } from '@/lib/email-platform/videos/job-queue';
import { shouldRunVideoInlineInLocal } from '@/lib/email-platform/videos/local-inline';
import { createCampaignVideo } from '@/lib/email-platform/videos/service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const id = String((await params).id || '');
  console.log(`[route] POST /video/create id=${id}`);
  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }
  try {
    if (shouldRunVideoInlineInLocal()) {
      const result = await createCampaignVideo(id);
      await logEmailAudit({
        actor: 'admin',
        action: 'campaign_video_created',
        entityType: 'email_campaign',
        entityId: id,
        payload: {
          campaignName: result.campaignName,
          status: result.status,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
        },
      });
      return NextResponse.json({ ok: true, status: result.status, mode: 'inline' });
    }

    await enqueueCampaignVideoJob({ campaignId: id, jobKind: 'create' });
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_video_enqueued',
      entityType: 'email_campaign',
      entityId: id,
      payload: { jobKind: 'create' },
    });
    return NextResponse.json({ ok: true, status: 'queued' }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue video creation' },
      { status: 500 }
    );
  }
}
