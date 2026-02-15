const EXCLUDED_FRONTEND_VENDORS = new Set([
  'vetsupply.com.au',
]);

export function isExcludedFrontendVendor(vendor?: string | null): boolean {
  if (!vendor) return false;
  return EXCLUDED_FRONTEND_VENDORS.has(vendor.trim().toLowerCase());
}

export function filterExcludedFrontendVendors<T extends { vendor?: string | null }>(
  products: T[]
): T[] {
  if (products.length === 0) return products;
  return products.filter((product) => !isExcludedFrontendVendor(product.vendor));
}
