import { NextResponse } from 'next/server';
import { sendQueuedCampaignRecipients } from '@/lib/email-platform/sending';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await sendQueuedCampaignRecipients({ campaignId: id });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to send campaign:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
