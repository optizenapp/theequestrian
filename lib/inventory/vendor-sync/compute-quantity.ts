import type { VendorInventoryLevel } from '@/lib/shopify/vendor-shopify-rest';
import type { VendorShopConnectionRow } from './repository';

function allowedSet(connection: VendorShopConnectionRow): Set<string> | null {
  const raw = connection.allowed_location_ids;
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length > 0) {
    return new Set(raw.map((x) => String(x)));
  }
  return null;
}

/**
 * Resolved sellable quantity from vendor inventory levels (after Admin re-fetch).
 */
export function resolveVendorAvailableQuantity(
  connection: VendorShopConnectionRow,
  levels: VendorInventoryLevel[],
  webhookLocationId?: number | null
): number {
  const allow = allowedSet(connection);

  if (connection.inventory_strategy === 'summed_locations') {
    let sum = 0;
    for (const l of levels) {
      if (allow && !allow.has(String(l.location_id))) continue;
      sum += Math.max(0, l.available);
    }
    return sum;
  }

  // single_location
  const primary = connection.primary_location_id;
  if (primary) {
    const hit = levels.find((l) => String(l.location_id) === String(primary));
    return hit ? Math.max(0, hit.available) : 0;
  }

  if (webhookLocationId != null) {
    const hit = levels.find((l) => l.location_id === webhookLocationId);
    if (hit) return Math.max(0, hit.available);
  }

  if (levels.length === 1) return Math.max(0, levels[0].available);

  const fallback = levels.reduce((acc, l) => acc + Math.max(0, l.available), 0);
  return fallback;
}
