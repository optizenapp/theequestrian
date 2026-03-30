import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { fetchVendorInventoryLevels } from '@/lib/shopify/vendor-shopify-rest';
import {
  fetchMarketplaceInventoryLevel,
  setMarketplaceInventoryLevel,
} from '@/lib/shopify/marketplace-inventory-rest';
import { resolveVendorAvailableQuantity } from '@/lib/inventory/vendor-sync/compute-quantity';
import {
  canRunReconcile,
  getReconcileTargetsForMarketplaceInventory,
  markReconcileRun,
} from '@/lib/inventory/vendor-sync/repository';

export const runtime = 'nodejs';
export const maxDuration = 60;

type InventoryWebhookBody = {
  inventory_item_id?: number;
  location_id?: number;
  available?: number;
};

function verifyShopifyWebhook(req: NextRequest, body: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  if (!secret || !hmac) return false;
  const digest = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

function runAsync(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyShopifyWebhook(req, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: InventoryWebhookBody;
  try {
    body = JSON.parse(rawBody) as InventoryWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const itemId = body.inventory_item_id;
  const locationId = body.location_id;
  if (itemId == null || locationId == null) {
    return NextResponse.json({ ok: false, error: 'missing_inventory_ids' }, { status: 400 });
  }

  runAsync(async () => {
    const targets = await getReconcileTargetsForMarketplaceInventory(String(itemId), String(locationId));
    if (targets.length === 0) return;

    const currentQty =
      typeof body.available === 'number'
        ? Math.max(0, Math.floor(body.available))
        : await fetchMarketplaceInventoryLevel({ inventoryItemId: itemId, locationId });

    for (const target of targets) {
      if (!canRunReconcile(target.connection)) {
        continue;
      }
      try {
        const vendorLevels = await fetchVendorInventoryLevels(
          target.connection.shop_domain,
          target.connection.access_token,
          Number(target.vendor_inventory_item_id)
        );
        const desiredQty = resolveVendorAvailableQuantity(
          target.connection,
          vendorLevels,
          target.vendor_location_id ? Number(target.vendor_location_id) : null
        );
        if (currentQty != null && desiredQty === currentQty) {
          continue;
        }
        await setMarketplaceInventoryLevel({
          inventoryItemId: Number(target.marketplace_inventory_item_id),
          locationId: Number(target.marketplace_location_id),
          available: desiredQty,
        });
        await markReconcileRun(target.connection.id);
        console.log(
          '[vendor-sync] inventory reconcile',
          target.connection.shop_domain,
          'marketplace_item',
          target.marketplace_inventory_item_id,
          'qty',
          desiredQty
        );
      } catch (error) {
        console.error('[vendor-sync] inventory reconcile failed', target.connection.shop_domain, error);
      }
    }
  });

  return NextResponse.json({ ok: true, accepted: true, itemId, locationId });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'shopify-marketplace-inventory-reconcile',
    configured: Boolean(process.env.SHOPIFY_WEBHOOK_SECRET),
  });
}
