import { NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { resendNonOpenersForCampaign } from '@/lib/email-platform/auto-campaigns/resend-non-openers-for-campaign';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resendNonOpenersForCampaign({
      parentCampaignId: id,
      actor: 'manual-resend',
    });

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_resend_non_openers',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        childCampaignId: result.childCampaignId,
        recipientCount: result.recipientCount,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        reason: result.reason,
      },
    });

    if (result.reason === 'no_non_openers') {
      return NextResponse.json(
        { error: 'No non-openers to resend (everyone with a tracked send already opened)' },
        { status: 409 }
      );
    }
    if (result.reason === 'insert_failed') {
      return NextResponse.json(
        { error: 'Failed to create resend campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      parentCampaignId: id,
      childCampaignId: result.childCampaignId,
      recipientCount: result.recipientCount,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend to non-openers';
    const status = message === 'Campaign not found' ? 404 : message.startsWith('Only completed') ? 409 : 500;
    if (status === 500) {
      console.error('Failed to resend non-openers:', error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
