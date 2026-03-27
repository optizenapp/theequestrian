/**
 * Shopify Admin REST calls against a vendor's shop (custom app access token).
 */

const API_VERSION = '2025-01';

export type VendorInventoryLevel = {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at?: string;
};

export async function vendorShopifyRest<T>(
  shopDomain: string,
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const host = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${host}/admin/api/${API_VERSION}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vendor Shopify REST ${response.status}: ${text.slice(0, 500)}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchVendorInventoryLevels(
  shopDomain: string,
  accessToken: string,
  inventoryItemId: number
): Promise<VendorInventoryLevel[]> {
  const data = await vendorShopifyRest<{ inventory_levels: VendorInventoryLevel[] }>(
    shopDomain,
    accessToken,
    `/inventory_levels.json?inventory_item_ids=${inventoryItemId}`
  );
  return data.inventory_levels || [];
}

export type VendorProductPayload = {
  product: {
    id: number;
    title?: string;
    variants: Array<{
      id: number;
      price: string;
      compare_at_price?: string | null;
      inventory_item_id?: number;
    }>;
  };
};

export async function fetchVendorProduct(
  shopDomain: string,
  accessToken: string,
  productId: number
): Promise<VendorProductPayload['product']> {
  const data = await vendorShopifyRest<VendorProductPayload>(
    shopDomain,
    accessToken,
    `/products/${productId}.json`
  );
  if (!data.product) throw new Error('Vendor product response missing product');
  return data.product;
}
