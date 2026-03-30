import { sql } from '@/lib/db/client';

export type VendorShopConnectionRow = {
  id: number;
  shop_domain: string;
  marketplace_vendor_name: string;
  access_token: string;
  inventory_strategy: string;
  primary_location_id: string | null;
  allowed_location_ids: unknown;
  sync_price: boolean;
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

let priceSyncVendorCache: { names: string[]; at: number } | null = null;
const PRICE_SYNC_CACHE_MS = 60_000;

export async function getVendorConnectionByDomain(
  shopDomain: string
): Promise<VendorShopConnectionRow | null> {
  try {
    const normalized = shopDomain.toLowerCase().trim();
    const rows = await sql`
      SELECT id, shop_domain, marketplace_vendor_name, access_token,
        inventory_strategy, primary_location_id, allowed_location_ids, sync_price, is_active
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

export function invalidateVendorSyncPriceCache(): void {
  priceSyncVendorCache = null;
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
      inventory_strategy, sync_price, is_active
    ) VALUES (
      ${shopDomain.toLowerCase().trim()},
      ${marketplaceVendorName.trim()},
      ${accessToken},
      'single_location',
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
