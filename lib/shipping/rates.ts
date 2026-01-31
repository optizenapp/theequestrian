/**
 * Vendor Shipping Rates - Postgres Version
 * Centralized module for loading and resolving shipping rates
 */

import { sql } from '@/lib/db/client';

export interface VendorRate {
  vendor: string;
  baseRate: number;
  tagOverrides: Record<string, number>;
  weightTiers?: Array<{ min: number; max: number; rate: number }>;
}

export interface ShippingRates {
  vendorRates: Map<string, VendorRate>;
  tagRates: Map<string, number>;
}

// Cache for 15 minutes
let cachedRates: ShippingRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Load all shipping rates from Postgres
 */
export async function loadShippingRates(): Promise<ShippingRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedRates;
  }

  // Load from database
  const vendorRates = new Map<string, VendorRate>();
  const tagRates = new Map<string, number>();

  // Load vendor rates
  const vendors = await sql`
    SELECT 
      vendor_name,
      base_rate,
      tag_overrides,
      weight_tiers
    FROM vendor_shipping_rates
    WHERE active = true
  `;

  for (const row of vendors) {
    vendorRates.set(row.vendor_name, {
      vendor: row.vendor_name,
      baseRate: parseFloat(row.base_rate),
      tagOverrides: row.tag_overrides || {},
      weightTiers: row.weight_tiers || undefined,
    });
  }

  // Load global tag rates
  const tags = await sql`
    SELECT tag, rate
    FROM shipping_tag_rates
    WHERE active = true
  `;

  for (const row of tags) {
    tagRates.set(row.tag, parseFloat(row.rate));
  }

  // Update cache
  cachedRates = { vendorRates, tagRates };
  cacheTimestamp = now;

  return cachedRates;
}

/**
 * Invalidate cache (call after updating rates)
 */
export function invalidateCache() {
  cachedRates = null;
  cacheTimestamp = 0;
}

/**
 * Normalize tags (handle arrays or comma-separated strings)
 */
export function normalizeTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

/**
 * Resolve shipping offset for a product
 * Priority:
 * 1. Vendor-specific tag overrides
 * 2. Weight-based rates (if weight provided)
 * 3. Base vendor rate
 * 4. Global tag rates (fallback)
 */
export function resolveShippingOffset(
  vendor: string,
  tags: string[],
  rates: ShippingRates,
  weight?: number
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
    for (const tag of normalizedTags) {
      const cleanTag = tag.replace(/^#/, '').trim();
      const tagOverride = vendorMatch.tagOverrides[tag] || vendorMatch.tagOverrides[cleanTag];
      if (tagOverride !== undefined) {
        return { shippingOffset: tagOverride, tagMatch: tag };
      }
    }

    // Priority 2: Weight-based rates
    if (vendorMatch.weightTiers && weight !== undefined) {
      for (const tier of vendorMatch.weightTiers) {
        if (weight >= tier.min && weight <= tier.max) {
          return { shippingOffset: tier.rate, tagMatch: null };
        }
      }
    }

    // Priority 3: Base vendor rate
    return { shippingOffset: vendorMatch.baseRate, tagMatch: null };
  }

  // Priority 4: Global tag rates (fallback)
  for (const tag of normalizedTags) {
    const cleanTag = tag.replace(/^#/, '').trim();
    const tagRate = rates.tagRates.get(tag) || rates.tagRates.get(cleanTag);
    if (tagRate !== undefined) {
      return { shippingOffset: tagRate, tagMatch: tag };
    }
  }

  return { shippingOffset: null, tagMatch: null };
}

/**
 * Get shipping cost for a product (synchronous, uses cached rates)
 * Returns 0 if no shipping cost applies or rates not loaded
 * 
 * Note: This is a synchronous wrapper for frontend use.
 * For backend/webhook use, call loadShippingRates() first.
 */
export function getShippingCost(
  vendor: string,
  tags: string[],
  weight?: number
): number {
  // If cache is empty or expired, return 0 (rates not loaded)
  if (!cachedRates) {
    return 0;
  }

  const result = resolveShippingOffset(vendor, tags, cachedRates, weight);
  return result.shippingOffset || 0;
}
