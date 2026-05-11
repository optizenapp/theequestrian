import { NextRequest, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { enqueueCampaignVideoJob } from '@/lib/email-platform/videos/job-queue';
import { shouldRunVideoInlineInLocal } from '@/lib/email-platform/videos/local-inline';
import { regenerateCampaignVideoWithNewMusic } from '@/lib/email-platform/videos/service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const id = String((await params).id || '');
  console.log(`[route] POST /video/regenerate-music id=${id}`);
  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }
  try {
    if (shouldRunVideoInlineInLocal()) {
      const result = await regenerateCampaignVideoWithNewMusic(id);
      await logEmailAudit({
        actor: 'admin',
        action: 'campaign_video_music_regenerated',
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

    await enqueueCampaignVideoJob({ campaignId: id, jobKind: 'regenerate_music' });
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_video_enqueued',
      entityType: 'email_campaign',
      entityId: id,
      payload: { jobKind: 'regenerate_music' },
    });
    return NextResponse.json({ ok: true, status: 'queued' }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue music regeneration' },
      { status: 500 }
    );
  }
}
