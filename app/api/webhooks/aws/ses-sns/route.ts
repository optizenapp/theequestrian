import { NextRequest, NextResponse } from 'next/server';
import { verifySnsHttpMessageSignature } from '@/lib/aws/sns-verify-signature';
import { processSesEventFromSnsMessage } from '@/lib/email-platform/ses-sns-event-handler';

export const dynamic = 'force-dynamic';

type SnsEnvelope = {
  Type?: string;
  Message?: string;
  SubscribeURL?: string;
  TopicArn?: string;
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let envelope: SnsEnvelope;
    try {
      envelope = JSON.parse(rawBody) as SnsEnvelope;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const secret = process.env.AWS_SNS_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = request.headers.get('x-sns-webhook-secret');
      if (headerSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const verified = await verifySnsHttpMessageSignature(envelope as Record<string, unknown>);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid SNS signature' }, { status: 401 });
    }

    const type = envelope.Type;
    if (type === 'SubscriptionConfirmation' && envelope.SubscribeURL) {
      const confirmResponse = await fetch(envelope.SubscribeURL, { method: 'GET', cache: 'no-store' });
      if (!confirmResponse.ok) {
        console.error('SNS subscription confirm failed:', confirmResponse.status);
        return NextResponse.json({ error: 'Subscription confirm failed' }, { status: 502 });
      }
      return NextResponse.json({ ok: true, confirmed: true });
    }

    if (type === 'UnsubscribeConfirmation') {
      return NextResponse.json({ ok: true, ignored: 'unsubscribe' });
    }

    if (type === 'Notification' && typeof envelope.Message === 'string') {
      await processSesEventFromSnsMessage(envelope.Message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    console.error('SES SNS webhook failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
