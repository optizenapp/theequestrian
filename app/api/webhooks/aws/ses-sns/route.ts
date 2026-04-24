import { NextRequest, NextResponse } from 'next/server';
import { processSesEventFromSnsMessage } from '@/lib/email-platform/ses-sns-event-handler';

export const dynamic = 'force-dynamic';

type SnsEnvelope = {
  Type?: string;
  Message?: string;
  SubscribeURL?: string;
};

function hasValidWebhookSecret(request: NextRequest): boolean {
  const expected = process.env.AWS_SNS_WEBHOOK_SECRET;
  if (!expected) return true;
  const providedHeader = request.headers.get('x-sns-webhook-secret') || '';
  if (providedHeader === expected) return true;
  const providedQuery =
    request.nextUrl.searchParams.get('x-sns-webhook-secret') ||
    request.nextUrl.searchParams.get('secret') ||
    '';
  return providedQuery === expected;
}

async function confirmSubscription(url: string): Promise<void> {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`SNS subscription confirmation failed (${response.status})`);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidWebhookSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.text();
    let envelope: SnsEnvelope;
    try {
      envelope = JSON.parse(raw) as SnsEnvelope;
    } catch {
      return NextResponse.json({ error: 'Invalid SNS payload JSON' }, { status: 400 });
    }

    const type = envelope.Type || '';
    if (type === 'SubscriptionConfirmation' || type === 'UnsubscribeConfirmation') {
      if (!envelope.SubscribeURL) {
        return NextResponse.json({ error: 'Missing SubscribeURL' }, { status: 400 });
      }
      await confirmSubscription(envelope.SubscribeURL);
      return NextResponse.json({ ok: true, type, confirmed: true });
    }

    if (type === 'Notification') {
      if (!envelope.Message) {
        return NextResponse.json({ error: 'Missing SNS Message' }, { status: 400 });
      }
      let sesMessage: unknown;
      try {
        sesMessage = JSON.parse(envelope.Message);
      } catch {
        return NextResponse.json({ error: 'Invalid SES message JSON' }, { status: 400 });
      }
      await processSesEventFromSnsMessage(sesMessage);
      return NextResponse.json({ ok: true, type });
    }

    return NextResponse.json({ ok: true, ignoredType: type || 'unknown' });
  } catch (error) {
    console.error('SES SNS webhook failed:', error);
    return NextResponse.json({ error: 'SES SNS webhook failed' }, { status: 500 });
  }
}
