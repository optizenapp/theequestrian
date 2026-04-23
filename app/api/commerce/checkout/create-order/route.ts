import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createCommerceOrder, type CommerceOrderItemInput } from '@/lib/commerce/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CreateOrderBody = {
  customerEmail?: string;
  currencyCode?: string;
  shippingCents?: number;
  paymentIntentId?: string;
  items?: CommerceOrderItemInput[];
};

function validItems(items: CommerceOrderItemInput[]): boolean {
  return items.every(
    (item) =>
      Number.isInteger(item.canonicalVariantId) &&
      Number.isInteger(item.integrationId) &&
      Number.isInteger(item.quantity) &&
      Number.isInteger(item.unitPriceCents) &&
      item.quantity > 0 &&
      item.unitPriceCents >= 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    const customerEmail = (body.customerEmail || '').trim().toLowerCase();
    if (!customerEmail) {
      return NextResponse.json({ error: 'customerEmail is required' }, { status: 400 });
    }
    const paymentIntentId = (body.paymentIntentId || '').trim();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0 || !validItems(items)) {
      return NextResponse.json({ error: 'items are invalid' }, { status: 400 });
    }
    const shippingCents = Number.isInteger(body.shippingCents) ? Number(body.shippingCents) : 0;
    if (shippingCents < 0) {
      return NextResponse.json({ error: 'shippingCents cannot be negative' }, { status: 400 });
    }
    const result = await createCommerceOrder({
      customerEmail,
      currencyCode: (body.currencyCode || 'AUD').toUpperCase(),
      shippingCents,
      paymentIntentId,
      idempotencyKey: crypto.randomUUID(),
      items,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create commerce order', detail: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/commerce/checkout/create-order',
    method: 'POST',
  });
}
