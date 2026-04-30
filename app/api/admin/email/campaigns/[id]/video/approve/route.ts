import { NextRequest, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { updateCampaignVideoReview } from '@/lib/email-platform/videos/service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const id = String((await params).id || '');
    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    }
    await updateCampaignVideoReview(id, 'approved');
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_video_approved',
      entityType: 'email_campaign',
      entityId: id,
    });
    return NextResponse.json({ ok: true, status: 'approved' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve video' },
      { status: 500 }
    );
  }
}
