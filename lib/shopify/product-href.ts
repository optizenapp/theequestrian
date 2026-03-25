import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { getProductCanonicalUrls } from '@/lib/shopify/products';

/**
 * Resolve storefront paths for product handles using the same rules as
 * getProductCanonicalUrl (allocations, metafield, productType, /products/ fallback).
 */
export async function getCanonicalHrefByHandles(handles: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(handles.filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const products = await getProductsByHandles(unique);
  const urlByProductId = await getProductCanonicalUrls(products);
  const out: Record<string, string> = {};
  for (const p of products) {
    out[p.handle] = urlByProductId.get(p.id) ?? `/products/${p.handle}`;
  }
  return out;
}
