/** Internal vendor keys → customer-facing warehouse location. Never expose keys in UI. */

const GENERIC_AU_WAREHOUSE = 'an Australian warehouse';

const VENDOR_LOCATIONS: Record<string, string> = {
  'trailrace equestrian outfitters': 'Tuggerah, NSW',
  trailrace: 'Tuggerah, NSW',
  'living horse tails jewellery by monika': 'Goulburn, NSW',
  'living horse tales jewellery by monika': 'Goulburn, NSW',
  'toptac international': 'Heatherbrae, NSW',
  toptac: 'Heatherbrae, NSW',
  'jnk collective': 'rural north-west Victoria',
  jnk: 'rural north-west Victoria',
  'exclusively equine': 'Cambooya, QLD',
  'little equine co': 'Macclesfield, SA',
  'little equine co.': 'Macclesfield, SA',
  'little equine': 'Macclesfield, SA',
  'can animal care': 'NSW',
  'qj riding wear': 'Adelaide Hills, SA',
};

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

export { GENERIC_AU_WAREHOUSE };
