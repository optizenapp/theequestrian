import { tagsIndicateFreeShipping } from '@/lib/shipping/free-shipping';
import {
  SHIPPING_CHECKOUT_MESSAGE,
  SHIPPING_PRODUCT_FREE_MESSAGE,
  shippingThresholdMessage,
  vendorShippingCheckoutMessage,
} from '@/lib/shipping/messaging';
import {
  getVendorFreeShippingThreshold,
  loadShippingRates,
  resolveShippingOffset,
  type ShippingRates,
} from '@/lib/shipping/rates';

export type ProductShippingDisplay = {
  shortMessage: string;
  badgeLabel?: string;
  isShippingIncluded: boolean;
  /** For schema.org and legacy free-shipping checks */
  hasFreeShipping: boolean;
};

export const SHIPPING_DISPLAY_FALLBACK: ProductShippingDisplay = {
  shortMessage: SHIPPING_CHECKOUT_MESSAGE,
  isShippingIncluded: false,
  hasFreeShipping: false,
};

function freeShippingDisplay(): ProductShippingDisplay {
  return {
    shortMessage: SHIPPING_PRODUCT_FREE_MESSAGE,
    badgeLabel: 'FREE SHIPPING',
    isShippingIncluded: false,
    hasFreeShipping: true,
  };
}

export function resolveProductShippingDisplaySync(input: {
  vendor: string;
  tags: string[];
  price?: number;
  rates: ShippingRates;
}): ProductShippingDisplay {
  if (tagsIndicateFreeShipping(input.tags)) {
    return freeShippingDisplay();
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
    return freeShippingDisplay();
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
      shortMessage: shippingThresholdMessage(threshold),
      isShippingIncluded: false,
      hasFreeShipping: false,
    };
  }

  if (shippingOffset != null && shippingOffset > 0) {
    return {
      shortMessage: vendorShippingCheckoutMessage(shippingOffset),
      isShippingIncluded: false,
      hasFreeShipping: false,
    };
  }

  return SHIPPING_DISPLAY_FALLBACK;
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
    return SHIPPING_DISPLAY_FALLBACK;
  }
}
