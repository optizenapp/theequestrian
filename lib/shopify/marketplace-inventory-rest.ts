/**
 * Marketplace Shopify Admin REST: set inventory levels (source of truth for checkout).
 */

const API_VERSION = '2025-01';
const MAX_SHOPIFY_RETRIES = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.ceil(retryAfter * 1000);
  }
  return Math.min(10_000, 1_000 * 2 ** (attempt - 1));
}

async function marketplaceFetch(path: string, init: RequestInit, label: string): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= MAX_SHOPIFY_RETRIES; attempt += 1) {
    const response = await fetch(marketplaceRestUrl(path), {
      ...init,
      cache: 'no-store',
    });
    if (response.status !== 429) return response;

    lastResponse = response;
    const waitMs = retryDelayMs(response, attempt);
    // Keep logs audit-friendly: silently back off on transient rate limits.
    // We only emit a log if all retries are exhausted.
    await sleep(waitMs);
  }
  if (lastResponse) {
    console.error(
      `[shopify-rest] Rate limited ${label}; exhausted ${MAX_SHOPIFY_RETRIES} retries`
    );
  }
  return lastResponse!;
}

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
  const response = await marketplaceFetch(
    '/inventory_levels/set.json',
    {
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
    },
    `inventory set ${input.inventoryItemId}`
  );

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
  const response = await marketplaceFetch(
    `/inventory_levels.json?location_ids=${input.locationId}&inventory_item_ids=${input.inventoryItemId}`,
    {
      headers: { 'X-Shopify-Access-Token': token },
    },
    `inventory fetch ${input.inventoryItemId}`
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
  const response = await marketplaceFetch(
    `/products/${productIdNumeric}.json`,
    {
      headers: { 'X-Shopify-Access-Token': token },
    },
    `product fetch ${productIdNumeric}`
  );
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
  const response = await marketplaceFetch(
    `/variants.json?sku=${encodeURIComponent(sku)}&limit=5`,
    { headers: { 'X-Shopify-Access-Token': token } },
    `variant sku lookup ${sku}`
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

export type MarketplaceProductStatus = 'active' | 'draft' | 'archived';

export async function fetchMarketplaceProductStatus(
  productIdNumeric: string
): Promise<MarketplaceProductStatus | null> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await marketplaceFetch(
    `/products/${productIdNumeric}.json?fields=id,status`,
    { headers: { 'X-Shopify-Access-Token': token } },
    `product status fetch ${productIdNumeric}`
  );
  if (!response.ok) {
    if (response.status === 404) return null;
    const text = await response.text();
    throw new Error(`Marketplace product status fetch ${response.status}: ${text.slice(0, 400)}`);
  }
  const data = (await response.json()) as { product?: { status?: string } };
  const status = data.product?.status;
  if (status === 'active' || status === 'draft' || status === 'archived') return status;
  return null;
}

export async function setMarketplaceProductStatus(input: {
  productIdNumeric: string;
  status: MarketplaceProductStatus;
}): Promise<void> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await marketplaceFetch(
    `/products/${input.productIdNumeric}.json`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        product: { id: Number(input.productIdNumeric), status: input.status },
      }),
    },
    `product status set ${input.productIdNumeric}`
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Marketplace product status set ${response.status}: ${text.slice(0, 400)}`);
  }
}

export type MarketplaceVariantInventoryItem = {
  variantId: string;
  inventoryItemId: string;
};

export async function fetchMarketplaceProductVariants(
  productIdNumeric: string
): Promise<MarketplaceVariantInventoryItem[]> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const response = await marketplaceFetch(
    `/products/${productIdNumeric}.json?fields=id,variants`,
    { headers: { 'X-Shopify-Access-Token': token } },
    `product variants fetch ${productIdNumeric}`
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    const text = await response.text();
    throw new Error(`Marketplace product variants fetch ${response.status}: ${text.slice(0, 400)}`);
  }
  const data = (await response.json()) as {
    product?: { variants?: Array<{ id: number; inventory_item_id: number }> };
  };
  const variants = data.product?.variants ?? [];
  return variants.map((v) => ({
    variantId: String(v.id),
    inventoryItemId: String(v.inventory_item_id),
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
  const response = await marketplaceFetch(
    `/variants/${input.variantIdNumeric}.json`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ variant }),
    },
    `variant price ${input.variantIdNumeric}`
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Marketplace variant price ${response.status}: ${text.slice(0, 400)}`);
  }
}
