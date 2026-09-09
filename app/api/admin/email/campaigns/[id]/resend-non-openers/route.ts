import { after, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { resendNonOpenersForCampaign } from '@/lib/email-platform/auto-campaigns/resend-non-openers-for-campaign';
import { sendQueuedCampaignRecipients } from '@/lib/email-platform/sending';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function runAsync(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let subjectLine: string | undefined;
    try {
      const body = (await request.json()) as { subjectLine?: unknown };
      if (typeof body?.subjectLine === 'string' && body.subjectLine.trim().length > 0) {
        subjectLine = body.subjectLine.trim();
      }
    } catch {
      // Empty body is fine for backwards compatibility (AI subject fallback).
    }

    if (!subjectLine) {
      return NextResponse.json(
        { error: 'A new subject line is required before resending to non-openers' },
        { status: 400 }
      );
    }

    const result = await resendNonOpenersForCampaign({
      parentCampaignId: id,
      actor: 'manual-resend',
      subjectLine,
      deferSend: true,
    });

    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_resend_non_openers',
      entityType: 'email_campaign',
      entityId: id,
      payload: {
        childCampaignId: result.childCampaignId,
        recipientCount: result.recipientCount,
        deferredSend: true,
        reason: result.reason,
        subjectLine,
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

    const childCampaignId = result.childCampaignId;
    if (childCampaignId) {
      runAsync(async () => {
        try {
          await sendQueuedCampaignRecipients({ campaignId: childCampaignId });
        } catch (error) {
          console.error('[resend-non-openers] background send failed:', error);
        }
      });
    }

    return NextResponse.json({
      ok: true,
      parentCampaignId: id,
      childCampaignId: result.childCampaignId,
      recipientCount: result.recipientCount,
      sent: 0,
      failed: 0,
      skipped: 0,
      deferred: true,
      subjectLine,
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
