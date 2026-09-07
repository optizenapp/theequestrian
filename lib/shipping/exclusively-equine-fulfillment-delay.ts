import { normalizeVendorKey } from '@/lib/shipping/vendor-aliases';

/** Temporary vendor fulfillment pause — remove after 24 Sep 2026. */
export const EE_FULFILLMENT_DELAY_VENDOR = 'Exclusively Equine';
export const EE_FULFILLMENT_DELAY_BRAND_HANDLE = 'exclusively-equine';

export const EE_FULFILLMENT_DELAY_MESSAGE =
  'Please note, you can order this product, but currently there is a delay in delivery — Orders will not be fulfilled until on or after the 24th September 2026';

export const EE_FULFILLMENT_DELAY_BRAND_MESSAGE =
  'Please note, you can order products from this brand, but currently there is a delay in delivery — Orders will not be fulfilled until on or after the 24th September 2026';

export function isExclusivelyEquineFulfillmentDelayVendor(
  vendor: string | null | undefined
): boolean {
  if (!vendor?.trim()) return false;
  return normalizeVendorKey(vendor) === normalizeVendorKey(EE_FULFILLMENT_DELAY_VENDOR);
}

export function isExclusivelyEquineFulfillmentDelayBrandHandle(
  handle: string | null | undefined
): boolean {
  return handle?.trim().toLowerCase() === EE_FULFILLMENT_DELAY_BRAND_HANDLE;
}
