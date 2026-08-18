/** Collective / Webkul aggregator vendors — product vendor is not the sellable brand. */
const MARKETPLACE_VENDOR_KEYS = new Set([
  'trailrace',
  'trailraceequestrianoutfitters',
  'webkul',
  'equinemarketplace',
  'exclusivelyequine',
  'toptacinternational',
  'littleequineco',
  'cananimalcare',
  'wadogroomingsupplies',
  'petfoodaustralia',
]);

/** Collective vendors that also have a published house-brand hub. */
const DUAL_VENDOR_BRAND_KEYS = new Set(['petfoodaustralia']);

function normalizeVendorKey(vendor: string): string {
  return vendor
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function isMarketplaceAggregatorVendor(vendor: string | null | undefined): boolean {
  if (!vendor?.trim()) return false;
  return MARKETPLACE_VENDOR_KEYS.has(normalizeVendorKey(vendor));
}

/** True when the assigned product brand is a real hub even if the Shopify vendor uses the same name. */
export function isDualVendorBrand(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  return DUAL_VENDOR_BRAND_KEYS.has(normalizeVendorKey(name));
}
