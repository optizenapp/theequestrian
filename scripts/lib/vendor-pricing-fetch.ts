/**
 * Paginated Shopify Admin REST fetch of product variants (read-only).
 * Used by the vendor pricing audit to bulk-load vendor and marketplace prices.
 */

import { normalizeTags } from '@/lib/shipping/rates';

const API_VERSION = '2025-01';
const PAGE_DELAY_MS = 300;

export interface VariantRecord {
  productId: string;
  variantId: string;
  sku: string;
  price: number | null;
  compareAt: number | null;
  tags: string[];
  status: string;
}

type ShopifyVariant = { id: number; sku?: string | null; price?: string | null; compare_at_price?: string | null };
type ShopifyProduct = { id: number; status?: string; tags?: string; variants?: ShopifyVariant[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Fetch every variant for a store, keyed by variant id. Optionally filter by
 * Shopify product `vendor` (used on the marketplace side to scope one vendor).
 */
export async function fetchAllVariants(
  shopDomain: string,
  accessToken: string,
  vendorFilter?: string
): Promise<Map<string, VariantRecord>> {
  const host = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const variants = new Map<string, VariantRecord>();
  let url: string | null =
    `https://${host}/admin/api/${API_VERSION}/products.json?limit=250` +
    (vendorFilter ? `&vendor=${encodeURIComponent(vendorFilter)}` : '');

  while (url) {
    const response: Response = await fetch(url, { headers: { 'X-Shopify-Access-Token': accessToken } });
    if (!response.ok) {
      throw new Error(`Shopify products fetch ${host} ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const linkHeader = response.headers.get('link') || '';
    const data = (await response.json()) as { products?: ShopifyProduct[] };

    for (const product of data.products ?? []) {
      const tags = normalizeTags(product.tags);
      const status = product.status ?? 'unknown';
      for (const variant of product.variants ?? []) {
        variants.set(String(variant.id), {
          productId: String(product.id),
          variantId: String(variant.id),
          sku: (variant.sku ?? '').trim(),
          price: toNumber(variant.price),
          compareAt: toNumber(variant.compare_at_price),
          tags,
          status,
        });
      }
    }

    const next = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
    if (url) await sleep(PAGE_DELAY_MS);
  }

  return variants;
}

/**
 * Fetch specific variants by variant id (one request each). Tags/status are not
 * available from the variant endpoint, so they are left empty. Used on the
 * vendor side of limited spot checks, where only price/compare-at are needed.
 */
export async function fetchVariantsByIds(
  shopDomain: string,
  accessToken: string,
  variantIds: string[]
): Promise<Map<string, VariantRecord>> {
  const host = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const variants = new Map<string, VariantRecord>();
  for (const id of variantIds) {
    const url = `https://${host}/admin/api/${API_VERSION}/variants/${id}.json`;
    const response: Response = await fetch(url, { headers: { 'X-Shopify-Access-Token': accessToken } });
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(`Shopify variant fetch ${host} ${id} ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    const data = (await response.json()) as { variant?: ShopifyVariant & { product_id?: number } };
    const variant = data.variant;
    if (!variant) continue;
    variants.set(String(variant.id), {
      productId: String(variant.product_id ?? ''),
      variantId: String(variant.id),
      sku: (variant.sku ?? '').trim(),
      price: toNumber(variant.price),
      compareAt: toNumber(variant.compare_at_price),
      tags: [],
      status: 'unknown',
    });
    await sleep(PAGE_DELAY_MS);
  }
  return variants;
}

/**
 * Fetch specific products by id (one request each) and return every variant
 * keyed by variant id, including product tags/status. Used on the marketplace
 * side of limited spot checks, where tags drive the shipping offset.
 */
export async function fetchVariantsByProductIds(
  shopDomain: string,
  accessToken: string,
  productIds: string[]
): Promise<Map<string, VariantRecord>> {
  const host = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const variants = new Map<string, VariantRecord>();
  for (const productId of [...new Set(productIds)]) {
    const url = `https://${host}/admin/api/${API_VERSION}/products/${productId}.json`;
    const response: Response = await fetch(url, { headers: { 'X-Shopify-Access-Token': accessToken } });
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(`Shopify product fetch ${host} ${productId} ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    const data = (await response.json()) as { product?: ShopifyProduct };
    const product = data.product;
    if (!product) continue;
    const tags = normalizeTags(product.tags);
    const status = product.status ?? 'unknown';
    for (const variant of product.variants ?? []) {
      variants.set(String(variant.id), {
        productId: String(product.id),
        variantId: String(variant.id),
        sku: (variant.sku ?? '').trim(),
        price: toNumber(variant.price),
        compareAt: toNumber(variant.compare_at_price),
        tags,
        status,
      });
    }
    await sleep(PAGE_DELAY_MS);
  }
  return variants;
}
