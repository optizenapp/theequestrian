import type { VendorRate, TagRate } from '../csv/loadRates.js';

export interface ShippingRates {
  vendorRates: Map<string, VendorRate>;
  tagRates: Map<string, TagRate>;
}

const COLLECTIVE_TAG = 'shopify collective';

/** Marketplace vendor names that must never get a shipping price offset. */
const COLLECTIVE_VENDORS = new Set(
  [
    'toptac international',
    'toptac',
    'jnk collective',
    'jnk',
    'exclusively equine',
    'little equine co.',
    'little equine co',
    'little equine',
    'can animal care',
    'plum tack',
    'qj riding wear',
    'qj ridingwear',
    'trailrace',
    'trailrace equestrian outfitters',
    'living horse tails jewellery by monika',
    'living horse tales jewellery by monika',
    'wa dog grooming supplies',
    'breyer horses australia',
  ].map((s) => s.toLowerCase())
);

export function normalizeTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

function isCollectiveProduct(vendor: string, tags: string[]): boolean {
  if (tags.some((t) => t.trim().toLowerCase() === COLLECTIVE_TAG)) return true;
  const v = vendor.toLowerCase().trim();
  if (!v) return false;
  if (COLLECTIVE_VENDORS.has(v)) return true;
  for (const name of COLLECTIVE_VENDORS) {
    if (v.includes(name) || name.includes(v)) return true;
  }
  return false;
}

/**
 * Resolve shipping offset for a Shopify product
 * Priority:
 * 0. Shopify Collective — never bake freight into price
 * 1. Vendor-specific tag overrides (e.g., Ascot + #HEAVY)
 * 2. Weight-based rates (if weight available)
 * 3. Base vendor rate
 * 4. Global tag rates (fallback)
 */
export function resolveShippingOffset(
  vendor: string,
  tags: string[],
  rates: ShippingRates
): { shippingOffset: number | null; tagMatch: string | null } {
  const normalizedTags = normalizeTags(tags);
  const vendorLower = vendor.toLowerCase().trim();

  if (isCollectiveProduct(vendor, normalizedTags)) {
    return { shippingOffset: 0, tagMatch: 'shopify_collective' };
  }

  // Find vendor match (case-insensitive)
  let vendorMatch: VendorRate | undefined;
  for (const [vendorName, rate] of rates.vendorRates.entries()) {
    if (vendorName.toLowerCase() === vendorLower) {
      vendorMatch = rate;
      break;
    }
  }

  if (vendorMatch) {
    // Priority 1: Vendor-specific tag overrides
    if (vendorMatch.tagOverrides && vendorMatch.tagOverrides.size > 0) {
      for (const tag of normalizedTags) {
        const cleanTag = tag.replace(/^#/, '').trim();
        const tagOverride = vendorMatch.tagOverrides.get(tag) || vendorMatch.tagOverrides.get(cleanTag);
        if (tagOverride !== undefined) {
          return { shippingOffset: tagOverride, tagMatch: tag };
        }
      }
    }

    // Priority 2: Weight-based rates (TODO: requires product weight)
    // if (vendorMatch.weightBased && weightInKg !== undefined) { ... }

    // Priority 3: Use base vendor rate
    return { shippingOffset: vendorMatch.shippingCost, tagMatch: null };
  }

  // Priority 4: Check global tag rates (fallback)
  for (const tag of normalizedTags) {
    const cleanTag = tag.replace(/^#/, '').trim();
    const tagRate = rates.tagRates.get(tag) || rates.tagRates.get(cleanTag);
    if (tagRate !== undefined) {
      return { shippingOffset: tagRate.shippingCost, tagMatch: tag };
    }
  }

  return { shippingOffset: null, tagMatch: null };
}
