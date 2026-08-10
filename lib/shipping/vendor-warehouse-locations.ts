/** Internal vendor keys → customer-facing warehouse location. Never expose keys in UI. */

import { getWarehouseSlugForVendor, listWarehouses } from '@/lib/warehouses/registry';

const GENERIC_AU_WAREHOUSE = 'an Australian warehouse';

const VENDOR_LOCATIONS: Record<string, string> = {};
for (const wh of listWarehouses()) {
  for (const name of wh.vendorNames) {
    VENDOR_LOCATIONS[name.trim().toLowerCase().replace(/\s+/g, ' ')] = wh.displayName;
  }
}

function normalizeVendorKey(vendor: string): string {
  return vendor.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Customer-facing place name, or null if unmapped. */
export function resolveWarehouseLocation(vendor: string | null | undefined): string | null {
  if (!vendor?.trim()) return null;
  return VENDOR_LOCATIONS[normalizeVendorKey(vendor)] ?? null;
}

/** Always safe to show: mapped location or generic Australian warehouse. */
export function resolveWarehouseLabel(vendor: string | null | undefined): string {
  return resolveWarehouseLocation(vendor) ?? GENERIC_AU_WAREHOUSE;
}

export function isMappedWarehouse(vendor: string | null | undefined): boolean {
  return resolveWarehouseLocation(vendor) != null;
}

export { GENERIC_AU_WAREHOUSE, getWarehouseSlugForVendor };
