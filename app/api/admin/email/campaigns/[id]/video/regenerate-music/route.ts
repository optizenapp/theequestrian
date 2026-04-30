import { NextRequest, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { regenerateCampaignVideoWithNewMusic } from '@/lib/email-platform/videos/service';
import { startBackgroundCampaignVideoTask } from '@/lib/email-platform/videos/run-in-background';

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
    await startBackgroundCampaignVideoTask({
      campaignId: id,
      label: 'regenerate-music',
      task: async () => {
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
      },
    });
    return NextResponse.json({ ok: true, status: 'rendering' }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start music regeneration' },
      { status: 500 }
    );
  }
}
