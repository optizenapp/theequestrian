/**
 * Shopify Collective sellers — shipping is calculated at checkout,
 * never baked into product price via vendor_shipping_rates offsets.
 */

import { getVendorAliasKeys, normalizeVendorKey } from '@/lib/shipping/vendor-aliases';

export const COLLECTIVE_TAG = 'shopify collective';

/** Canonical Collective marketplace vendor names (Shopify Product.vendor). */
export const COLLECTIVE_VENDORS = [
  'Toptac International',
  'JnK Collective',
  'Exclusively Equine',
  'Little Equine Co.',
  'CAN Animal Care',
  'Plum Tack',
  'QJ Riding Wear',
  'Trailrace',
] as const;

const collectiveVendorKeys = new Set<string>();

function ensureCollectiveVendorKeys(): Set<string> {
  if (collectiveVendorKeys.size > 0) return collectiveVendorKeys;
  for (const name of COLLECTIVE_VENDORS) {
    for (const key of getVendorAliasKeys(name)) {
      collectiveVendorKeys.add(key);
    }
    collectiveVendorKeys.add(normalizeVendorKey(name));
  }
  return collectiveVendorKeys;
}

export function tagsIndicateCollective(tags: string[] | null | undefined): boolean {
  if (!tags?.length) return false;
  return tags.some((t) => t.trim().toLowerCase() === COLLECTIVE_TAG);
}

export function isCollectiveVendor(vendor: string | null | undefined): boolean {
  if (!vendor?.trim()) return false;
  const keys = ensureCollectiveVendorKeys();
  return getVendorAliasKeys(vendor).some((k) => keys.has(k));
}

/** True when product should never receive a shipping price offset. */
export function isCollectiveProduct(input: {
  vendor?: string | null;
  tags?: string[] | null;
}): boolean {
  return tagsIndicateCollective(input.tags) || isCollectiveVendor(input.vendor);
}
