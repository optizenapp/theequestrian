import type { VendorRate, TagRate } from '../csv/loadRates.js';

export interface ShippingRates {
  vendorRates: Map<string, VendorRate>;
  tagRates: Map<string, TagRate>;
}

/**
 * Resolve shipping offset for a Shopify product.
 * Permanently returns 0 — freight is never baked into variant price.
 */
export function normalizeTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
}

export function resolveShippingOffset(
  _vendor: string,
  _tags: string[],
  _rates: ShippingRates
): { shippingOffset: number | null; tagMatch: string | null } {
  return { shippingOffset: 0, tagMatch: 'price_offset_disabled' };
}
