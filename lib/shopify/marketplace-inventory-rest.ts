/**
 * Marketplace Shopify Admin REST: set inventory levels (source of truth for checkout).
 */

const API_VERSION = '2025-01';

function marketplaceRestUrl(path: string): string {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!storeDomain || !token) {
    throw new Error('SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are required');
  }
  const host = storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${host}/admin/api/${API_VERSION}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function setMarketplaceInventoryLevel(input: {
  locationId: number;
  inventoryItemId: number;
  available: number;
}): Promise<void> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await fetch(marketplaceRestUrl('/inventory_levels/set.json'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      location_id: input.locationId,
      inventory_item_id: input.inventoryItemId,
      available: Math.max(0, Math.floor(input.available)),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Marketplace inventory set ${response.status}: ${text.slice(0, 500)}`);
  }
}

export async function fetchMarketplaceInventoryLevel(input: {
  locationId: number;
  inventoryItemId: number;
}): Promise<number | null> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await fetch(
    marketplaceRestUrl(
      `/inventory_levels.json?location_ids=${input.locationId}&inventory_item_ids=${input.inventoryItemId}`
    ),
    {
      headers: { 'X-Shopify-Access-Token': token },
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Marketplace inventory fetch ${response.status}: ${text.slice(0, 500)}`);
  }
  const data = (await response.json()) as {
    inventory_levels?: Array<{ available?: number | null }>;
  };
  const first = data.inventory_levels?.[0];
  if (!first || typeof first.available !== 'number') return null;
  return Math.max(0, Math.floor(first.available));
}

export async function fetchMarketplaceProductTags(productIdNumeric: string): Promise<{
  vendor: string;
  tags: string[];
}> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await fetch(marketplaceRestUrl(`/products/${productIdNumeric}.json`), {
    headers: { 'X-Shopify-Access-Token': token },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Marketplace product fetch ${response.status}: ${text.slice(0, 400)}`);
  }
  const data = (await response.json()) as {
    product?: { vendor?: string; tags?: string };
  };
  const product = data.product;
  if (!product) throw new Error('Marketplace product missing');
  const raw = product.tags || '';
  const tags = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return { vendor: product.vendor || '', tags };
}

export type MarketplaceVariantStub = {
  variantId: string;
  productId: string;
  inventoryItemId: string;
  sku: string;
};

/**
 * Look up marketplace variants by exact SKU.
 * Returns all matches (there should be 0 or 1 per SKU in a well-managed catalog).
 */
export async function lookupMarketplaceVariantsBySku(
  sku: string
): Promise<MarketplaceVariantStub[]> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await fetch(
    marketplaceRestUrl(`/variants.json?sku=${encodeURIComponent(sku)}&limit=5`),
    { headers: { 'X-Shopify-Access-Token': token }, cache: 'no-store' }
  );
  if (!response.ok) return [];
  const data = (await response.json()) as {
    variants?: Array<{
      id: number;
      product_id: number;
      inventory_item_id: number;
      sku?: string;
    }>;
  };
  return (data.variants ?? []).map((v) => ({
    variantId: String(v.id),
    productId: String(v.product_id),
    inventoryItemId: String(v.inventory_item_id),
    sku: v.sku ?? sku,
  }));
}

export async function updateMarketplaceVariantPriceRest(input: {
  variantIdNumeric: string;
  price: string;
  compareAtPrice?: string | null;
}): Promise<void> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const variant: Record<string, unknown> = {
    id: Number(input.variantIdNumeric),
    price: input.price,
  };
  if (input.compareAtPrice !== undefined) {
    // Pass null explicitly to clear compare_at_price when vendor no longer has a sale price
    variant.compare_at_price = input.compareAtPrice ?? null;
  }
  const response = await fetch(
    marketplaceRestUrl(`/variants/${input.variantIdNumeric}.json`),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ variant }),
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Marketplace variant price ${response.status}: ${text.slice(0, 400)}`);
  }
}
