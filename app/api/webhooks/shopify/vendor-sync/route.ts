import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { verifyVendorSyncWebhook } from '@/lib/inventory/vendor-sync/verify-webhook';
import { processVendorInventoryLevelsWebhook } from '@/lib/inventory/vendor-sync/process-inventory';
import { processVendorProductUpdateWebhook } from '@/lib/inventory/vendor-sync/process-product';

export const runtime = 'nodejs';
export const maxDuration = 60;

function runAsync(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

/**
 * Vendor Shopify → marketplace sync. Register on each vendor store (same custom app):
 * - inventory_levels/update
 * - products/update (when sync_price enabled for that connection)
 *
 * Secret: VENDOR_SYNC_APP_CLIENT_SECRET (Shopify app client secret).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.VENDOR_SYNC_APP_CLIENT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'VENDOR_SYNC_APP_CLIENT_SECRET not configured' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  if (!verifyVendorSyncWebhook(rawBody, hmac, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const topic = request.headers.get('x-shopify-topic') || '';
  const shop = request.headers.get('x-shopify-shop-domain') || '';

  runAsync(async () => {
    try {
      if (topic === 'inventory_levels/update') {
        await processVendorInventoryLevelsWebhook(shop, rawBody);
      } else if (topic === 'products/update') {
        await processVendorProductUpdateWebhook(shop, rawBody);
      } else {
        console.log('[vendor-sync] ignored topic', topic, shop);
      }
    } catch (e) {
      console.error('[vendor-sync] async error', topic, shop, e);
    }
  });

  return NextResponse.json({ ok: true, accepted: true, topic, shop });
}

export async function GET() {
  const configured = Boolean(process.env.VENDOR_SYNC_APP_CLIENT_SECRET);
  return NextResponse.json({
    ok: true,
    service: 'shopify-vendor-sync-webhook',
    configured,
  });
}
