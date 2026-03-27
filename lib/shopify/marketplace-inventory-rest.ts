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
  if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
    variant.compare_at_price = input.compareAtPrice;
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
