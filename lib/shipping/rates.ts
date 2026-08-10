/**
 * Vendor Shipping Rates - Postgres Version
 * Centralized module for loading and resolving shipping rates
 */

import { sql } from '@/lib/db/client';
import { ensureVendorShippingColumns } from '@/lib/db/ensure-vendor-shipping-columns';
import { getVendorAliasKeys, normalizeVendorKey } from '@/lib/shipping/vendor-aliases';

export interface VendorRate {
  vendor: string;
  baseRate: number;
  tagOverrides: Record<string, number>;
  weightTiers?: Array<{ min: number; max: number; rate: number }>;
  // When set, items priced at or above this amount get no shipping offset
  // (free shipping absorbs the cost). Compared against the item's base price.
  freeShippingThreshold?: number | null;
}

export interface ShippingRates {
  /** Original vendor_name → rate */
  vendorRates: Map<string, VendorRate>;
  /** Lowercase/normalized vendor key → rate (includes lookup via aliases) */
  vendorRatesByKey: Map<string, VendorRate>;
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

  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  const vendorRates = new Map<string, VendorRate>();
  const tagRates = new Map<string, number>();

  await ensureVendorShippingColumns();

  try {
    const vendors = await sql`
      SELECT
        vendor_name,
        base_rate,
        tag_overrides,
        weight_tiers,
        free_shipping_threshold
      FROM vendor_shipping_rates
      WHERE active = true
    `;
    appendVendorRates(vendorRates, vendors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('free_shipping_threshold')) {
      throw err;
    }
    console.warn('[loadShippingRates] free_shipping_threshold missing; loading without threshold');
    const vendors = await sql`
      SELECT vendor_name, base_rate, tag_overrides, weight_tiers
      FROM vendor_shipping_rates
      WHERE active = true
    `;
    appendVendorRates(vendorRates, vendors);
  }

  const tags = await sql`
    SELECT tag, rate
    FROM shipping_tag_rates
    WHERE active = true
  `;

  const tagsArray = Array.isArray(tags) ? tags : [];
  for (const rowRaw of tagsArray) {
    const row = rowRaw as { tag: string; rate: string | number };
    tagRates.set(row.tag, parseFloat(String(row.rate)));
  }

  const vendorRatesByKey = buildVendorRateKeyIndex(vendorRates);
  cachedRates = { vendorRates, vendorRatesByKey, tagRates };
  cacheTimestamp = now;

  return cachedRates;
}

function buildVendorRateKeyIndex(vendorRates: Map<string, VendorRate>): Map<string, VendorRate> {
  const byKey = new Map<string, VendorRate>();
  for (const [vendorName, rate] of vendorRates.entries()) {
    for (const aliasKey of getVendorAliasKeys(vendorName)) {
      if (!byKey.has(aliasKey)) {
        byKey.set(aliasKey, rate);
      }
    }
    const selfKey = normalizeVendorKey(vendorName);
    if (!byKey.has(selfKey)) {
      byKey.set(selfKey, rate);
    }
  }
  return byKey;
}

export function findVendorRate(
  vendor: string,
  rates: ShippingRates
): VendorRate | undefined {
  if (!vendor.trim()) return undefined;
  for (const aliasKey of getVendorAliasKeys(vendor)) {
    const match = rates.vendorRatesByKey.get(aliasKey);
    if (match) return match;
  }
  return rates.vendorRatesByKey.get(normalizeVendorKey(vendor));
}

function appendVendorRates(vendorRates: Map<string, VendorRate>, vendors: unknown): void {
  const vendorsArray = Array.isArray(vendors) ? vendors : [];
  for (const rowRaw of vendorsArray) {
    const row = rowRaw as {
      vendor_name: string;
      base_rate: string | number;
      tag_overrides: Record<string, number> | null;
      weight_tiers: Array<{ min: number; max: number; rate: number }> | null;
      free_shipping_threshold?: string | number | null;
    };
    const thresholdRaw = row.free_shipping_threshold;
    const threshold = thresholdRaw == null ? null : parseFloat(String(thresholdRaw));
    vendorRates.set(row.vendor_name, {
      vendor: row.vendor_name,
      baseRate: parseFloat(String(row.base_rate)),
      tagOverrides: row.tag_overrides || {},
      weightTiers: row.weight_tiers || undefined,
      freeShippingThreshold: threshold != null && !Number.isNaN(threshold) ? threshold : null,
    });
  }
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
  weight?: number,
  price?: number
): { shippingOffset: number | null; tagMatch: string | null } {
  const normalizedTags = normalizeTags(tags);
  const vendorMatch = findVendorRate(vendor, rates);

  if (vendorMatch) {
    // Priority 0: Free-shipping threshold. Items at/above the threshold ship
    // free, so no offset is added — this overrides tag/weight/base rates.
    if (
      vendorMatch.freeShippingThreshold != null &&
      price != null &&
      Number.isFinite(price) &&
      price >= vendorMatch.freeShippingThreshold
    ) {
      return { shippingOffset: 0, tagMatch: 'free_shipping_threshold' };
    }

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
  weight?: number,
  price?: number
): number {
  // If cache is empty or expired, return 0 (rates not loaded)
  if (!cachedRates) {
    return 0;
  }

  const result = resolveShippingOffset(vendor, tags, cachedRates, weight, price);
  return result.shippingOffset || 0;
}

/**
 * Free-shipping threshold for a vendor (case-insensitive), or null if none set.
 */
export function getVendorFreeShippingThreshold(
  vendor: string,
  rates: ShippingRates
): number | null {
  return findVendorRate(vendor, rates)?.freeShippingThreshold ?? null;
}
