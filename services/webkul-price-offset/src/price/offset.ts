import type { WebkulProduct } from '../webkul/types';

export interface VendorRate {
  vendor: string;
  shippingCost: number;
  tagOverrides?: Map<string, number>;
  weightBased?: { min: number; max: number; cost: number }[];
}

export interface ShippingRates {
  vendorRates: Map<string, VendorRate>;
  tagRates: Map<string, { tag: string; shippingCost: number }>;
  sellerMapping: Map<string, string>;
}

export function normalizeTags(tags?: string[] | string): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => tag.trim()).filter(Boolean);
  const trimmed = tags.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to comma parsing.
    }
  }
  return trimmed
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function resolveShippingOffset(
  product: WebkulProduct,
  rates: ShippingRates
): { shippingOffset: number | null; tagMatch: string | null } {
  const tags = normalizeTags(product.product_tag ?? product.tags);

  // Look up vendor name from seller_id first
  let vendorName: string | undefined;
  
  if (product.seller_id) {
    vendorName = rates.sellerMapping.get(String(product.seller_id));
  }
  
  // Fall back to product.vendor or product.brand_name if no seller mapping
  if (!vendorName && product.vendor) {
    vendorName = product.vendor;
  }
  
  if (!vendorName && product.brand_name) {
    vendorName = product.brand_name;
  }
  
  // Get vendor rate config
  const vendorMatch = vendorName ? rates.vendorRates.get(vendorName) : null;
  
  if (vendorMatch) {
    // Priority 1: Check for vendor-specific tag overrides (e.g., Ascot Saddlery + #HEAVY)
    if (vendorMatch.tagOverrides && vendorMatch.tagOverrides.size > 0) {
      for (const tag of tags) {
        const cleanTag = tag.replace(/^#/, '').trim();
        const tagOverride = vendorMatch.tagOverrides.get(tag) || vendorMatch.tagOverrides.get(cleanTag);
        if (tagOverride !== undefined) {
          return { shippingOffset: tagOverride, tagMatch: tag };
        }
      }
    }
    
    // Priority 2: Check for weight-based rates
    // TODO: Implement when we have product weight data
    
    // Priority 3: Use base vendor rate
    return { shippingOffset: vendorMatch.shippingCost, tagMatch: null };
  }

  // Priority 4: Check global tag rates (fallback)
  for (const tag of tags) {
    const cleanTag = tag.replace(/^#/, '').trim();
    const match = rates.tagRates.get(tag) || rates.tagRates.get(cleanTag);
    if (match) {
      return { shippingOffset: match.shippingCost, tagMatch: tag };
    }
  }

  return { shippingOffset: null, tagMatch: null };
}
