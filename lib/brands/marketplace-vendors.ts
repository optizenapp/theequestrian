/** Collective / Webkul aggregator vendors — product vendor is not the sellable brand. */
const MARKETPLACE_VENDOR_KEYS = new Set([
  'trailrace',
  'trailraceequestrianoutfitters',
  'webkul',
  'equinemarketplace',
]);

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
