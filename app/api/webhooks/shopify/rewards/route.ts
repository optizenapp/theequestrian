import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { reconcileOrderRewards } from '@/lib/rewards/reconcile';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SUPPORTED_TOPICS = new Set([
  'orders/paid',
  'orders/updated',
  'orders/cancelled',
  'orders/edited',
  'fulfillments/create',
  'fulfillments/update',
  'refunds/create',
]);

type WebhookPayload = {
  id?: number | string;
  order_id?: number | string;
  order_edit?: { order_id?: number | string };
};

function verifyShopifyWebhook(body: string, hmac: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmac) return false;
  const digest = Buffer.from(crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64'));
  const provided = Buffer.from(hmac);
  return digest.length === provided.length && crypto.timingSafeEqual(digest, provided);
}

function orderIdFromPayload(topic: string, payload: WebhookPayload): string | null {
  const raw = topic.startsWith('orders/')
    ? (payload.order_edit?.order_id ?? payload.id)
    : payload.order_id;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  return `gid://shopify/Order/${String(raw).trim()}`;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!verifyShopifyWebhook(body, request.headers.get('x-shopify-hmac-sha256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const topic = (request.headers.get('x-shopify-topic') || '').toLowerCase();
  if (!SUPPORTED_TOPICS.has(topic)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderGid = orderIdFromPayload(topic, payload);
  if (!orderGid) {
    return NextResponse.json({ received: true, skipped: 'missing order id' });
  }

  try {
    const outcome = await reconcileOrderRewards(orderGid);
    return NextResponse.json({ received: true, topic, outcome });
  } catch (error) {
    console.error('[rewards] Reconcile failed:', { topic, orderGid, error });
    return NextResponse.json({ error: 'Rewards reconcile failed' }, { status: 500 });
  }
}
