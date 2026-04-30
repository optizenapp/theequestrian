import { sql } from '@/lib/db/client';

export type VendorShopConnectionRow = {
  id: number;
  shop_domain: string;
  marketplace_vendor_name: string;
  access_token: string;
  inventory_strategy: string;
  primary_location_id: string | null;
  allowed_location_ids: unknown;
  sync_inventory: boolean;
  sync_price: boolean;
  sync_status: boolean;
  reconcile_enabled: boolean;
  reconcile_cooldown_seconds: number;
  last_reconcile_at: string | null;
  is_active: boolean;
};

export type VendorInventoryMapRow = {
  id: number;
  vendor_connection_id: number;
  vendor_shopify_product_id: string;
  vendor_shopify_variant_id: string;
  vendor_inventory_item_id: string;
  vendor_location_id: string | null;
  marketplace_product_id: string;
  marketplace_variant_id: string;
  marketplace_inventory_item_id: string;
  marketplace_location_id: string;
  sku: string | null;
  status: string;
};

export type VendorInventoryReconcileTarget = {
  connection: VendorShopConnectionRow;
  vendor_inventory_item_id: string;
  vendor_location_id: string | null;
  marketplace_inventory_item_id: string;
  marketplace_location_id: string;
};

export async function isMarketplaceVariantPriceLocked(
  marketplaceVariantId: string
): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT 1
      FROM marketplace_price_locks
      WHERE variant_id = ${marketplaceVariantId}
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    // If the table is missing (migration not yet applied) treat as not locked
    // so we don't break vendor sync. The migration is documented in
    // lib/db/schema/marketplace-price-locks.sql.
    console.warn('[vendor-sync] isMarketplaceVariantPriceLocked failed', e);
    return false;
  }
}

export type MarketplaceVariantLock = {
  lockedPrice: number;
  lockedCompareAt: number | null;
};

export async function getMarketplaceVariantLock(
  marketplaceVariantId: string
): Promise<MarketplaceVariantLock | null> {
  try {
    const rows = await sql`
      SELECT locked_price, locked_compare_at
      FROM marketplace_price_locks
      WHERE variant_id = ${marketplaceVariantId}
      LIMIT 1
    `;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0] as { locked_price: string | number; locked_compare_at: string | number | null };
    const lockedPrice = Number(row.locked_price);
    if (Number.isNaN(lockedPrice)) return null;
    const lockedCompareAtRaw =
      row.locked_compare_at == null ? null : Number(row.locked_compare_at);
    const lockedCompareAt =
      lockedCompareAtRaw != null && !Number.isNaN(lockedCompareAtRaw)
        ? lockedCompareAtRaw
        : null;
    return { lockedPrice, lockedCompareAt };
  } catch (e) {
    console.warn('[vendor-sync] getMarketplaceVariantLock failed', e);
    return null;
  }
}

let priceSyncVendorCache: { names: string[]; at: number } | null = null;
const PRICE_SYNC_CACHE_MS = 60_000;

export async function getVendorConnectionByDomain(
  shopDomain: string
): Promise<VendorShopConnectionRow | null> {
  try {
    const normalized = shopDomain.toLowerCase().trim();
    const rows = await sql`
      SELECT id, shop_domain, marketplace_vendor_name, access_token,
        inventory_strategy, primary_location_id, allowed_location_ids,
        sync_inventory, sync_price, sync_status, reconcile_enabled, reconcile_cooldown_seconds,
        last_reconcile_at, is_active
      FROM vendor_shop_connections
      WHERE LOWER(TRIM(shop_domain)) = ${normalized}
        AND is_active = true
      LIMIT 1
    `;
    const list = Array.isArray(rows) ? rows : [];
    const row = list[0] as VendorShopConnectionRow | undefined;
    return row ?? null;
  } catch (e) {
    console.warn('[vendor-sync] getVendorConnectionByDomain failed', e);
    return null;
  }
}

export async function getMarketplaceVendorsWithPriceSyncEnabled(): Promise<string[]> {
  const now = Date.now();
  if (priceSyncVendorCache && now - priceSyncVendorCache.at < PRICE_SYNC_CACHE_MS) {
    return priceSyncVendorCache.names;
  }
  try {
    const rows = await sql`
      SELECT marketplace_vendor_name
      FROM vendor_shop_connections
      WHERE is_active = true AND sync_price = true
    `;
    const list = Array.isArray(rows) ? rows : [];
    const names = list.map((r) =>
      String((r as { marketplace_vendor_name: string }).marketplace_vendor_name)
    );
    priceSyncVendorCache = { names, at: now };
    return names;
  } catch (e) {
    console.warn('[vendor-sync] Could not load vendor_shop_connections (migration applied?)', e);
    return [];
  }
}

export async function getReconcilePriceConnectionsByMarketplaceVendor(
  marketplaceVendorName: string
): Promise<VendorShopConnectionRow[]> {
  const normalized = marketplaceVendorName.toLowerCase().trim();
  const rows = await sql`
    SELECT id, shop_domain, marketplace_vendor_name, access_token,
      inventory_strategy, primary_location_id, allowed_location_ids,
      sync_inventory, sync_price, sync_status, reconcile_enabled, reconcile_cooldown_seconds,
      last_reconcile_at, is_active
    FROM vendor_shop_connections
    WHERE LOWER(TRIM(marketplace_vendor_name)) = ${normalized}
      AND is_active = true
      AND sync_price = true
      AND reconcile_enabled = true
  `;
  return (Array.isArray(rows) ? rows : []) as VendorShopConnectionRow[];
}

export function invalidateVendorSyncPriceCache(): void {
  priceSyncVendorCache = null;
}

export function canRunReconcile(connection: VendorShopConnectionRow): boolean {
  if (!connection.reconcile_enabled) return false;
  if (!connection.last_reconcile_at) return true;
  const last = new Date(connection.last_reconcile_at).getTime();
  if (Number.isNaN(last)) return true;
  const cooldownMs = Math.max(1, connection.reconcile_cooldown_seconds) * 1000;
  return Date.now() - last >= cooldownMs;
}

export async function markReconcileRun(connectionId: number): Promise<void> {
  await sql`
    UPDATE vendor_shop_connections
    SET last_reconcile_at = NOW(), updated_at = NOW()
    WHERE id = ${connectionId}
  `;
}

/** After Dev Dashboard OAuth: create or refresh vendor_shop_connections row. */
export async function upsertVendorOAuthConnection(
  shopDomain: string,
  marketplaceVendorName: string,
  accessToken: string
): Promise<void> {
  await sql`
    INSERT INTO vendor_shop_connections (
      shop_domain, marketplace_vendor_name, access_token,
      inventory_strategy, sync_inventory, sync_price, reconcile_enabled, is_active
    ) VALUES (
      ${shopDomain.toLowerCase().trim()},
      ${marketplaceVendorName.trim()},
      ${accessToken},
      'single_location',
      true,
      false,
      false,
      true
    )
    ON CONFLICT (shop_domain) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      marketplace_vendor_name = EXCLUDED.marketplace_vendor_name,
      updated_at = NOW()
  `;
  invalidateVendorSyncPriceCache();
}

export async function getReconcileTargetsForMarketplaceInventory(
  marketplaceInventoryItemId: string,
  marketplaceLocationId: string
): Promise<VendorInventoryReconcileTarget[]> {
  const rows = await sql`
    SELECT
      c.id, c.shop_domain, c.marketplace_vendor_name, c.access_token,
      c.inventory_strategy, c.primary_location_id, c.allowed_location_ids,
      c.sync_inventory, c.sync_price, c.sync_status, c.reconcile_enabled, c.reconcile_cooldown_seconds,
      c.last_reconcile_at, c.is_active,
      m.vendor_inventory_item_id, m.vendor_location_id,
      m.marketplace_inventory_item_id, m.marketplace_location_id
    FROM vendor_inventory_map m
    JOIN vendor_shop_connections c ON c.id = m.vendor_connection_id
    WHERE m.marketplace_inventory_item_id = ${marketplaceInventoryItemId}
      AND m.marketplace_location_id = ${marketplaceLocationId}
      AND m.status = 'active'
      AND c.is_active = true
      AND c.sync_inventory = true
      AND c.reconcile_enabled = true
  `;

  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => {
    const r = row as Record<string, unknown>;
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
      vendor_inventory_item_id: String(r.vendor_inventory_item_id),
      vendor_location_id: r.vendor_location_id ? String(r.vendor_location_id) : null,
      marketplace_inventory_item_id: String(r.marketplace_inventory_item_id),
      marketplace_location_id: String(r.marketplace_location_id),
    };
  });
}

export async function getActiveMapsForVendorInventoryItem(
  connectionId: number,
  vendorInventoryItemId: string
): Promise<VendorInventoryMapRow[]> {
  const rows = await sql`
    SELECT id, vendor_connection_id, vendor_shopify_product_id, vendor_shopify_variant_id,
      vendor_inventory_item_id, vendor_location_id, marketplace_product_id,
      marketplace_variant_id, marketplace_inventory_item_id, marketplace_location_id,
      sku, status
    FROM vendor_inventory_map
    WHERE vendor_connection_id = ${connectionId}
      AND vendor_inventory_item_id = ${vendorInventoryItemId}
      AND status = 'active'
  `;
  return (Array.isArray(rows) ? rows : []) as VendorInventoryMapRow[];
}

export async function getActiveMapsForVendorProduct(
  connectionId: number,
  vendorProductId: string
): Promise<VendorInventoryMapRow[]> {
  const rows = await sql`
    SELECT id, vendor_connection_id, vendor_shopify_product_id, vendor_shopify_variant_id,
      vendor_inventory_item_id, vendor_location_id, marketplace_product_id,
      marketplace_variant_id, marketplace_inventory_item_id, marketplace_location_id,
      sku, status
    FROM vendor_inventory_map
    WHERE vendor_connection_id = ${connectionId}
      AND vendor_shopify_product_id = ${vendorProductId}
      AND status = 'active'
  `;
  return (Array.isArray(rows) ? rows : []) as VendorInventoryMapRow[];
}

export async function getActiveMapsForMarketplaceProduct(
  connectionId: number,
  marketplaceProductId: string
): Promise<VendorInventoryMapRow[]> {
  const rows = await sql`
    SELECT id, vendor_connection_id, vendor_shopify_product_id, vendor_shopify_variant_id,
      vendor_inventory_item_id, vendor_location_id, marketplace_product_id,
      marketplace_variant_id, marketplace_inventory_item_id, marketplace_location_id,
      sku, status
    FROM vendor_inventory_map
    WHERE vendor_connection_id = ${connectionId}
      AND marketplace_product_id = ${marketplaceProductId}
      AND status = 'active'
  `;
  return (Array.isArray(rows) ? rows : []) as VendorInventoryMapRow[];
}
