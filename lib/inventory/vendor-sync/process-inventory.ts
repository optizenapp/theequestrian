import { fetchVendorInventoryLevels } from '@/lib/shopify/vendor-shopify-rest';
import { setMarketplaceInventoryLevel } from '@/lib/shopify/marketplace-inventory-rest';
import { sql } from '@/lib/db/client';
import {
  getActiveMapsForVendorInventoryItem,
  getVendorConnectionByDomain,
} from './repository';
import { resolveVendorAvailableQuantity } from './compute-quantity';

type InventoryWebhookBody = {
  inventory_item_id?: number;
  location_id?: number;
  available?: number;
};

export async function processVendorInventoryLevelsWebhook(
  shopDomain: string,
  rawBody: string
): Promise<{ ok: boolean; detail?: string; mapsUpdated?: number }> {
  let body: InventoryWebhookBody;
  try {
    body = JSON.parse(rawBody) as InventoryWebhookBody;
  } catch {
    return { ok: false, detail: 'invalid_json' };
  }

  const itemId = body.inventory_item_id;
  if (itemId == null) {
    return { ok: false, detail: 'missing_inventory_item_id' };
  }

  const connection = await getVendorConnectionByDomain(shopDomain);
  if (!connection) {
    console.warn('[vendor-sync] No active vendor_shop_connections for', shopDomain);
    return { ok: true, detail: 'unknown_shop' };
  }

  const levels = await fetchVendorInventoryLevels(
    connection.shop_domain,
    connection.access_token,
    itemId
  );

  const qty = resolveVendorAvailableQuantity(
    connection,
    levels,
    body.location_id ?? null
  );

  const itemStr = String(itemId);
  for (const level of levels) {
    const loc = String(level.location_id);
    const locQty = Math.max(0, level.available);
    await sql`
      INSERT INTO vendor_inventory_state (
        vendor_connection_id, vendor_shop_domain, vendor_inventory_item_id,
        vendor_location_id, available_quantity, last_source_check_at, last_webhook_at
      ) VALUES (
        ${connection.id},
        ${connection.shop_domain},
        ${itemStr},
        ${loc},
        ${locQty},
        NOW(),
        NOW()
      )
      ON CONFLICT (vendor_connection_id, vendor_inventory_item_id, vendor_location_id)
      DO UPDATE SET
        available_quantity = EXCLUDED.available_quantity,
        last_source_check_at = NOW(),
        last_webhook_at = NOW(),
        updated_at = NOW()
    `;
  }

  const maps = await getActiveMapsForVendorInventoryItem(connection.id, itemStr);
  if (maps.length === 0) {
    console.warn('[vendor-sync] Unmapped vendor inventory_item', itemStr, shopDomain);
    return { ok: true, detail: 'unmapped', mapsUpdated: 0 };
  }

  const dedupe = new Map<string, { locationId: number; inventoryItemId: number }>();
  for (const m of maps) {
    const key = `${m.marketplace_inventory_item_id}:${m.marketplace_location_id}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, {
        inventoryItemId: Number(m.marketplace_inventory_item_id),
        locationId: Number(m.marketplace_location_id),
      });
    }
  }

  for (const target of dedupe.values()) {
    await setMarketplaceInventoryLevel({
      inventoryItemId: target.inventoryItemId,
      locationId: target.locationId,
      available: qty,
    });
  }

  console.log(
    '[vendor-sync] inventory',
    shopDomain,
    'item',
    itemStr,
    '→ marketplace qty',
    qty,
    'targets',
    dedupe.size
  );

  return { ok: true, mapsUpdated: dedupe.size };
}
