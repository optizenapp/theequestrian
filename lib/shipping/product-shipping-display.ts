import { tagsIndicateFreeShipping } from '@/lib/shipping/free-shipping';
import {
  SHIPPING_CHECKOUT_MESSAGE,
  SHIPPING_DISPATCH_LINE,
  SHIPPING_PRODUCT_FREE_MESSAGE,
  shipsFromWarehouseHeadline,
  shippingThresholdMessage,
  vendorShippingCheckoutMessage,
} from '@/lib/shipping/messaging';
import {
  getVendorFreeShippingThreshold,
  loadShippingRates,
  resolveShippingOffset,
  type ShippingRates,
} from '@/lib/shipping/rates';
import {
  isMappedWarehouse,
  resolveWarehouseLabel,
} from '@/lib/shipping/vendor-warehouse-locations';

export type ProductShippingDisplay = {
  shortMessage: string;
  badgeLabel?: string;
  isShippingIncluded: boolean;
  /** For schema.org and legacy free-shipping checks */
  hasFreeShipping: boolean;
  /** Customer-facing origin (location or generic AU) — never vendor name */
  shipsFromLabel: string;
  originHeadline: string;
  dispatchLine: string;
  locationMapped: boolean;
};

const genericLabel = resolveWarehouseLabel(null);

export const SHIPPING_DISPLAY_FALLBACK: ProductShippingDisplay = {
  shortMessage: SHIPPING_CHECKOUT_MESSAGE,
  isShippingIncluded: false,
  hasFreeShipping: false,
  shipsFromLabel: genericLabel,
  originHeadline: shipsFromWarehouseHeadline(genericLabel, false),
  dispatchLine: SHIPPING_DISPATCH_LINE,
  locationMapped: false,
};

function freeShippingDisplay(origin: ProductShippingDisplay): ProductShippingDisplay {
  return {
    ...origin,
    shortMessage: SHIPPING_PRODUCT_FREE_MESSAGE,
    badgeLabel: 'FREE SHIPPING',
    isShippingIncluded: false,
    hasFreeShipping: true,
  };
}

function withOrigin(vendor: string): Pick<
  ProductShippingDisplay,
  'shipsFromLabel' | 'originHeadline' | 'dispatchLine' | 'locationMapped'
> {
  const shipsFromLabel = resolveWarehouseLabel(vendor);
  const locationMapped = isMappedWarehouse(vendor);
  return {
    shipsFromLabel,
    originHeadline: shipsFromWarehouseHeadline(shipsFromLabel, locationMapped),
    dispatchLine: SHIPPING_DISPATCH_LINE,
    locationMapped,
  };
}

export function resolveProductShippingDisplaySync(input: {
  vendor: string;
  tags: string[];
  price?: number;
  rates: ShippingRates;
}): ProductShippingDisplay {
  const origin = withOrigin(input.vendor);

  if (tagsIndicateFreeShipping(input.tags)) {
    return freeShippingDisplay({ ...SHIPPING_DISPLAY_FALLBACK, ...origin });
  }

  const price = input.price;
  const { shippingOffset } = resolveShippingOffset(
    input.vendor,
    input.tags,
    input.rates,
    undefined,
    price
  );

  if (shippingOffset === 0) {
    return freeShippingDisplay({ ...SHIPPING_DISPLAY_FALLBACK, ...origin });
  }

  const threshold = getVendorFreeShippingThreshold(input.vendor, input.rates);
  if (
    threshold != null &&
    price != null &&
    Number.isFinite(price) &&
    price < threshold &&
    shippingOffset != null &&
    shippingOffset > 0
  ) {
    return {
      ...origin,
      shortMessage: shippingThresholdMessage(threshold),
      isShippingIncluded: false,
      hasFreeShipping: false,
    };
  }

  if (shippingOffset != null && shippingOffset > 0) {
    return {
      ...origin,
      shortMessage: vendorShippingCheckoutMessage(shippingOffset),
      isShippingIncluded: false,
      hasFreeShipping: false,
    };
  }

  return { ...SHIPPING_DISPLAY_FALLBACK, ...origin };
}

export async function resolveProductShippingDisplay(input: {
  vendor: string;
  tags: string[];
  price?: number;
}): Promise<ProductShippingDisplay> {
  try {
    const rates = await loadShippingRates();
    return resolveProductShippingDisplaySync({ ...input, rates });
  } catch (error) {
    console.error('[resolveProductShippingDisplay] Failed:', error);
    return { ...SHIPPING_DISPLAY_FALLBACK, ...withOrigin(input.vendor) };
  }
}
