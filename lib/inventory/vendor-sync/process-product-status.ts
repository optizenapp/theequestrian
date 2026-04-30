import {
  setMarketplaceInventoryLevel,
  setMarketplaceProductStatus,
} from '@/lib/shopify/marketplace-inventory-rest';
import {
  getActiveMapsForVendorProduct,
  getVendorConnectionByDomain,
  type VendorInventoryMapRow,
} from './repository';
import {
  aggregateMarketplaceStatusForProduct,
  upsertVendorProductStatus,
  type VendorProductStatusValue,
} from './status-repository';

type StatusWebhookBody = {
  id?: number;
  status?: string;
};

function parseVendorStatus(raw: string | undefined): VendorProductStatusValue {
  if (raw === 'active' || raw === 'draft' || raw === 'archived') return raw;
  return 'draft';
}

async function draftAndZeroIfAllNonActive(
  marketplaceProductId: string,
  maps: VendorInventoryMapRow[],
  shopDomain: string
): Promise<'drafted' | 'skipped_has_active_sibling' | 'no_mappings'> {
  const agg = await aggregateMarketplaceStatusForProduct(marketplaceProductId);
  if (agg.totalMappings === 0) return 'no_mappings';
  if (!agg.allNonActive) {
    console.log(
      '[vendor-sync] status skip draft (sibling still active)',
      shopDomain,
      'marketplace',
      marketplaceProductId,
      'active=',
      agg.activeMappings,
      'non_active=',
      agg.nonActiveMappings,
      'unknown=',
      agg.unknownMappings
    );
    return 'skipped_has_active_sibling';
  }
  await setMarketplaceProductStatus({
    productIdNumeric: marketplaceProductId,
    status: 'draft',
  });
  const dedupe = new Map<string, { inventoryItemId: number; locationId: number }>();
  for (const m of maps) {
    if (m.marketplace_product_id !== marketplaceProductId) continue;
    const key = `${m.marketplace_inventory_item_id}:${m.marketplace_location_id}`;
    if (dedupe.has(key)) continue;
    dedupe.set(key, {
      inventoryItemId: Number(m.marketplace_inventory_item_id),
      locationId: Number(m.marketplace_location_id),
    });
  }
  for (const target of dedupe.values()) {
    await setMarketplaceInventoryLevel({ ...target, available: 0 });
  }
  return 'drafted';
}

export async function processVendorProductStatusWebhook(
  shopDomain: string,
  rawBody: string,
  webhookTopic: string
): Promise<{ ok: boolean; detail?: string; productsUpdated?: number }> {
  let body: StatusWebhookBody;
  try {
    body = JSON.parse(rawBody) as StatusWebhookBody;
  } catch {
    return { ok: false, detail: 'invalid_json' };
  }
  const productId = body.id;
  if (productId == null) return { ok: false, detail: 'missing_product_id' };

  const connection = await getVendorConnectionByDomain(shopDomain);
  if (!connection) return { ok: true, detail: 'unknown_shop' };
  if (!connection.sync_status) return { ok: true, detail: 'sync_status_disabled' };

  const isDelete = webhookTopic === 'products/delete';
  const vendorStatus: VendorProductStatusValue = isDelete
    ? 'deleted'
    : parseVendorStatus(body.status);

  const maps = await getActiveMapsForVendorProduct(connection.id, String(productId));
  const marketplaceProductIds = Array.from(
    new Set(maps.map((m) => m.marketplace_product_id))
  );

  if (marketplaceProductIds.length === 0) {
    await upsertVendorProductStatus({
      vendorConnectionId: connection.id,
      vendorShopifyProductId: String(productId),
      marketplaceProductId: null,
      vendorStatus,
      webhookTopic,
    });
    return { ok: true, detail: 'unmapped_product' };
  }

  let updated = 0;
  for (const mpId of marketplaceProductIds) {
    await upsertVendorProductStatus({
      vendorConnectionId: connection.id,
      vendorShopifyProductId: String(productId),
      marketplaceProductId: mpId,
      vendorStatus,
      webhookTopic,
    });
    try {
      if (vendorStatus === 'active') {
        await setMarketplaceProductStatus({ productIdNumeric: mpId, status: 'active' });
        updated += 1;
        console.log(
          '[vendor-sync] status activate',
          shopDomain,
          'vendor_product',
          productId,
          '→ marketplace',
          mpId
        );
      } else {
        const outcome = await draftAndZeroIfAllNonActive(mpId, maps, shopDomain);
        if (outcome === 'drafted') {
          updated += 1;
          console.log(
            '[vendor-sync] status draft+zero',
            shopDomain,
            'vendor_product',
            productId,
            '→ marketplace',
            mpId
          );
        }
      }
    } catch (e) {
      console.error(
        '[vendor-sync] status apply failed',
        shopDomain,
        'marketplace_product',
        mpId,
        e
      );
    }
  }

  return { ok: true, productsUpdated: updated };
}
