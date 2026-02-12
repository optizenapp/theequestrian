import { NextRequest, NextResponse } from 'next/server';
import { sendQueuedCampaignRecipients } from '@/lib/email-platform/sending';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await sendQueuedCampaignRecipients({
      campaignId: id,
      frequencyCapCount: Number(body?.frequencyCapCount || 3),
      frequencyCapDays: Number(body?.frequencyCapDays || 7),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to send campaign:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
