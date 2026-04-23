import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createStripePaymentIntent } from '@/lib/commerce/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CreateIntentBody = {
  amountCents?: number;
  currencyCode?: string;
  customerEmail?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateIntentBody;
    const amountCents = Number(body.amountCents || 0);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'amountCents must be a positive integer' }, { status: 400 });
    }
    const currencyCode = (body.currencyCode || 'AUD').toUpperCase();
    const idempotencyKey = crypto.randomUUID();
    const intent = await createStripePaymentIntent({
      amountCents,
      currencyCode,
      customerEmail: body.customerEmail,
      metadata: { source: 'commerce_mvp' },
      idempotencyKey,
    });
    return NextResponse.json({
      ok: true,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amountCents: intent.amount,
      currencyCode: intent.currency.toUpperCase(),
      status: intent.status,
      idempotencyKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create payment intent', detail: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/commerce/checkout/create-payment-intent',
    method: 'POST',
  });
}
