import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { upsertEmailContact } from '@/lib/email-platform/contacts';

function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }
  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  return hash === hmacHeader;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    if (!hmacHeader || !verifyShopifyWebhook(body, hmacHeader)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      id?: string | number;
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      accepts_marketing?: boolean;
      tags?: string;
    };

    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    if (!email) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const tags = typeof payload.tags === 'string' ? payload.tags.split(',').map((value) => value.trim()) : [];
    await upsertEmailContact({
      email,
      firstName: payload.first_name || null,
      lastName: payload.last_name || null,
      shopifyCustomerId: payload.id ? String(payload.id) : null,
      acceptsMarketing: payload.accepts_marketing !== false,
      source: 'shopify_webhook',
      metadata: { shopifyTags: tags },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Failed to process Shopify customer webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
