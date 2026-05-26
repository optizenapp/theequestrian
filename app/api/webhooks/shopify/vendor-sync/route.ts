import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { verifyVendorSyncWebhook } from '@/lib/inventory/vendor-sync/verify-webhook';
import { processVendorInventoryLevelsWebhook } from '@/lib/inventory/vendor-sync/process-inventory';
import { processVendorProductUpdateWebhook } from '@/lib/inventory/vendor-sync/process-product';
import { processVendorProductCreateWebhook } from '@/lib/inventory/vendor-sync/process-product-map';
import { processVendorProductStatusWebhook } from '@/lib/inventory/vendor-sync/process-product-status';
import { getAppCredentialsForShop, getAllAppSecrets } from '@/lib/shopify/vendor-oauth';

export const runtime = 'nodejs';
export const maxDuration = 300;

function runAsync(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

/**
 * Verify webhook HMAC, trying the per-shop secret first then all configured secrets.
 * This allows multiple vendor apps (one per vendor store) to share one endpoint.
 */
function verifyWebhookForShop(rawBody: string, hmac: string | null, shop: string): boolean {
  const creds = getAppCredentialsForShop(shop);
  if (creds && verifyVendorSyncWebhook(rawBody, hmac, creds.clientSecret)) {
    return true;
  }
  for (const secret of getAllAppSecrets()) {
    if (creds && secret === creds.clientSecret) continue;
    if (verifyVendorSyncWebhook(rawBody, hmac, secret)) return true;
  }
  return false;
}

/**
 * Vendor Shopify → marketplace sync. Register on each vendor store:
 * - inventory_levels/update
 * - products/update (price sync when sync_price; status mirror when sync_status)
 * - products/create (auto-map by SKU)
 * - products/delete (status mirror when sync_status)
 *
 * Supports multiple vendor apps: secret is resolved per shop domain using
 * VENDOR_SYNC_APP_CLIENT_SECRET_<SLUG> env vars (fallback to default).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const topic = request.headers.get('x-shopify-topic') || '';
  const shop = request.headers.get('x-shopify-shop-domain') || '';

  if (!verifyWebhookForShop(rawBody, hmac, shop)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Keep high-volume topics async for fast acknowledgement. Shopify removes
  // subscriptions after repeated non-2xx deliveries, so processing failures
  // should be logged without failing delivery acknowledgement.
  if (topic === 'inventory_levels/update') {
    runAsync(async () => {
      try {
        await processVendorInventoryLevelsWebhook(shop, rawBody);
      } catch (e) {
        console.error('[vendor-sync] async error', topic, shop, e);
      }
    });
    return NextResponse.json({ ok: true, accepted: true, topic, shop });
  }

  if (topic === 'products/update') {
    runAsync(async () => {
      try {
        await processVendorProductCreateWebhook(shop, rawBody);
        await processVendorProductUpdateWebhook(shop, rawBody);
        const statusResult = await processVendorProductStatusWebhook(shop, rawBody, topic);
        if (!statusResult.ok) {
          console.error('[vendor-sync] async status error', topic, shop, statusResult.detail);
        }
      } catch (e) {
        console.error('[vendor-sync] async error', topic, shop, e);
      }
    });
    return NextResponse.json({ ok: true, accepted: true, topic, shop });
  }

  try {
    if (topic === 'products/create') {
      await processVendorProductCreateWebhook(shop, rawBody);
      const statusResult = await processVendorProductStatusWebhook(shop, rawBody, topic);
      if (!statusResult.ok) {
        return NextResponse.json(
          { ok: false, topic, shop, error: statusResult.detail ?? 'status_sync_failed' },
          { status: 500 }
        );
      }
    } else if (topic === 'products/delete') {
      const statusResult = await processVendorProductStatusWebhook(shop, rawBody, topic);
      if (!statusResult.ok) {
        return NextResponse.json(
          { ok: false, topic, shop, error: statusResult.detail ?? 'status_sync_failed' },
          { status: 500 }
        );
      }
    } else {
      console.log('[vendor-sync] ignored topic', topic, shop);
    }
  } catch (e) {
    console.error('[vendor-sync] sync error', topic, shop, e);
    return NextResponse.json({ ok: false, topic, shop, error: 'processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepted: true, topic, shop });
}

export async function GET() {
  const configured = getAllAppSecrets().length > 0;
  return NextResponse.json({
    ok: true,
    service: 'shopify-vendor-sync-webhook',
    configured,
  });
}
