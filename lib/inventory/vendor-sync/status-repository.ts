import { sql } from '@/lib/db/client';
import type { VendorShopConnectionRow } from './repository';

export type VendorProductStatusValue = 'active' | 'draft' | 'archived' | 'deleted';

export type VendorProductStatusRow = {
  vendor_connection_id: number;
  vendor_shopify_product_id: string;
  marketplace_product_id: string | null;
  vendor_status: VendorProductStatusValue;
  last_webhook_topic: string | null;
  last_webhook_at: string | null;
};

let statusSyncVendorCache: { names: string[]; at: number } | null = null;
const STATUS_SYNC_CACHE_MS = 60_000;

export async function getMarketplaceVendorsWithStatusSyncEnabled(): Promise<string[]> {
  const now = Date.now();
  if (statusSyncVendorCache && now - statusSyncVendorCache.at < STATUS_SYNC_CACHE_MS) {
    return statusSyncVendorCache.names;
  }
  try {
    const rows = await sql`
      SELECT marketplace_vendor_name
      FROM vendor_shop_connections
      WHERE is_active = true AND sync_status = true
    `;
    const list = Array.isArray(rows) ? rows : [];
    const names = list.map((r) =>
      String((r as { marketplace_vendor_name: string }).marketplace_vendor_name)
    );
    statusSyncVendorCache = { names, at: now };
    return names;
  } catch (e) {
    console.warn('[vendor-sync] Could not load sync_status vendors (migration applied?)', e);
    return [];
  }
}

export function invalidateVendorStatusSyncCache(): void {
  statusSyncVendorCache = null;
}

export type MarketplaceStatusAggregate = {
  totalMappings: number;
  activeMappings: number;
  nonActiveMappings: number;
  unknownMappings: number;
  allNonActive: boolean;
};

/**
 * Aggregate the recorded vendor status across every active vendor_inventory_map
 * row for a marketplace product. Used to enforce the rule:
 *   "only mark marketplace product 'draft' if EVERY vendor product mapped into
 *    it is non-active."
 * `unknownMappings` counts mappings we don't yet have a vendor_product_status
 * row for — those are treated as active for safety (so we never draft a product
 * with an un-snapshotted source).
 */
export async function aggregateMarketplaceStatusForProduct(
  marketplaceProductId: string
): Promise<MarketplaceStatusAggregate> {
  const rows = await sql`
    SELECT s.vendor_status
    FROM vendor_inventory_map m
    LEFT JOIN vendor_product_status s
      ON s.vendor_connection_id = m.vendor_connection_id
     AND s.vendor_shopify_product_id = m.vendor_shopify_product_id
    WHERE m.marketplace_product_id = ${marketplaceProductId}
      AND m.status = 'active'
  `;
  const list = Array.isArray(rows) ? rows : [];
  let active = 0;
  let nonActive = 0;
  let unknown = 0;
  for (const r of list) {
    const s = (r as { vendor_status: string | null }).vendor_status;
    if (s === 'active') active += 1;
    else if (s === 'draft' || s === 'archived' || s === 'deleted') nonActive += 1;
    else unknown += 1;
  }
  const total = list.length;
  return {
    totalMappings: total,
    activeMappings: active,
    nonActiveMappings: nonActive,
    unknownMappings: unknown,
    allNonActive: total > 0 && active === 0 && unknown === 0 && nonActive === total,
  };
}

export async function upsertVendorProductStatus(input: {
  vendorConnectionId: number;
  vendorShopifyProductId: string;
  marketplaceProductId: string | null;
  vendorStatus: VendorProductStatusValue;
  webhookTopic: string;
}): Promise<void> {
  await sql`
    INSERT INTO vendor_product_status (
      vendor_connection_id, vendor_shopify_product_id, marketplace_product_id,
      vendor_status, last_webhook_topic, last_webhook_at
    ) VALUES (
      ${input.vendorConnectionId},
      ${input.vendorShopifyProductId},
      ${input.marketplaceProductId},
      ${input.vendorStatus},
      ${input.webhookTopic},
      NOW()
    )
    ON CONFLICT (vendor_connection_id, vendor_shopify_product_id) DO UPDATE SET
      marketplace_product_id = COALESCE(EXCLUDED.marketplace_product_id, vendor_product_status.marketplace_product_id),
      vendor_status = EXCLUDED.vendor_status,
      last_webhook_topic = EXCLUDED.last_webhook_topic,
      last_webhook_at = NOW(),
      updated_at = NOW()
  `;
}

/** Find the recorded vendor status for a marketplace product, scoped to vendors with sync_status enabled. */
export async function getVendorStatusForMarketplaceProduct(
  marketplaceProductId: string
): Promise<{ connection: VendorShopConnectionRow; row: VendorProductStatusRow } | null> {
  const rows = await sql`
    SELECT
      c.id, c.shop_domain, c.marketplace_vendor_name, c.access_token,
      c.inventory_strategy, c.primary_location_id, c.allowed_location_ids,
      c.sync_inventory, c.sync_price, c.sync_status, c.reconcile_enabled, c.reconcile_cooldown_seconds,
      c.last_reconcile_at, c.is_active,
      s.vendor_connection_id, s.vendor_shopify_product_id, s.marketplace_product_id,
      s.vendor_status, s.last_webhook_topic, s.last_webhook_at
    FROM vendor_product_status s
    JOIN vendor_shop_connections c ON c.id = s.vendor_connection_id
    WHERE s.marketplace_product_id = ${marketplaceProductId}
      AND c.is_active = true
      AND c.sync_status = true
    LIMIT 1
  `;
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return null;
  const r = list[0] as Record<string, unknown>;
  return {
    connection: {
      id: Number(r.id),
      shop_domain: String(r.shop_domain),
      marketplace_vendor_name: String(r.marketplace_vendor_name),
      access_token: String(r.access_token),
      inventory_strategy: String(r.inventory_strategy),
      primary_location_id: r.primary_location_id ? String(r.primary_location_id) : null,
      allowed_location_ids: r.allowed_location_ids ?? [],
      sync_inventory: Boolean(r.sync_inventory),
      sync_price: Boolean(r.sync_price),
      sync_status: Boolean(r.sync_status),
      reconcile_enabled: Boolean(r.reconcile_enabled),
      reconcile_cooldown_seconds: Number(r.reconcile_cooldown_seconds || 20),
      last_reconcile_at: r.last_reconcile_at ? String(r.last_reconcile_at) : null,
      is_active: Boolean(r.is_active),
    },
    row: {
      vendor_connection_id: Number(r.vendor_connection_id),
      vendor_shopify_product_id: String(r.vendor_shopify_product_id),
      marketplace_product_id: r.marketplace_product_id ? String(r.marketplace_product_id) : null,
      vendor_status: r.vendor_status as VendorProductStatusValue,
      last_webhook_topic: r.last_webhook_topic ? String(r.last_webhook_topic) : null,
      last_webhook_at: r.last_webhook_at ? String(r.last_webhook_at) : null,
    },
  };
}
