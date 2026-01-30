import type { VendorRate, TagRate } from '../csv/loadRates.js';

export interface ShippingRates {
  vendorRates: Map<string, VendorRate>;
  tagRates: Map<string, TagRate>;
}

export function normalizeTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

/**
 * Resolve shipping offset for a Shopify product
 * Priority:
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
