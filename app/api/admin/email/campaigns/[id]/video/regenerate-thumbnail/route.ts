import { NextRequest, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { regenerateCampaignThumbnails } from '@/lib/email-platform/videos/thumbnail-regenerate';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const id = String((await params).id || '');
  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }
  try {
    const result = await regenerateCampaignThumbnails(id);
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_video_thumbnails_regenerated',
      entityType: 'email_campaign',
      entityId: id,
      payload: { variants: result.updated },
    });
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate thumbnails';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
