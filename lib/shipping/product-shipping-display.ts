import { tagsIndicateFreeShipping } from '@/lib/shipping/free-shipping';
import {
  SHIPPING_CHECKOUT_MESSAGE,
  SHIPPING_DISPATCH_LINE,
  SHIPPING_PRODUCT_FREE_MESSAGE,
  shipsFromWarehouseHeadline,
  vendorShippingCheckoutMessage,
} from '@/lib/shipping/messaging';
import {
  loadShippingRates,
  resolveShippingOffset,
  type ShippingRates,
} from '@/lib/shipping/rates';
import {
  isMappedWarehouse,
  resolveWarehouseLabel,
} from '@/lib/shipping/vendor-warehouse-locations';
import { getCollectiveShippingRateByProductId } from '@/lib/db/collective-shipping-rates';
import { getWarehouseSlugForVendor } from '@/lib/warehouses/registry';

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
  warehouseSlug: string | null;
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
  warehouseSlug: null,
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
  'shipsFromLabel' | 'originHeadline' | 'dispatchLine' | 'locationMapped' | 'warehouseSlug'
> {
  const shipsFromLabel = resolveWarehouseLabel(vendor);
  const locationMapped = isMappedWarehouse(vendor);
  return {
    shipsFromLabel,
    originHeadline: shipsFromWarehouseHeadline(shipsFromLabel, locationMapped),
    dispatchLine: SHIPPING_DISPATCH_LINE,
    locationMapped,
    warehouseSlug: getWarehouseSlugForVendor(vendor),
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

  const { shippingOffset } = resolveShippingOffset(
    input.vendor,
    input.tags,
    input.rates,
    undefined,
    input.price
  );

  if (shippingOffset === 0) {
    return freeShippingDisplay({ ...SHIPPING_DISPLAY_FALLBACK, ...origin });
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
  /** Shopify product GID or numeric id — used for Collective rate cache */
  productId?: string | null;
}): Promise<ProductShippingDisplay> {
  try {
    if (input.productId) {
      const collective = await getCollectiveShippingRateByProductId(input.productId);
      if (collective) {
        const origin = withOrigin(input.vendor);
        if (tagsIndicateFreeShipping(input.tags) || Number(collective.standard_rate_aud) === 0) {
          return freeShippingDisplay({ ...SHIPPING_DISPLAY_FALLBACK, ...origin });
        }
        return {
          ...origin,
          shortMessage: vendorShippingCheckoutMessage(Number(collective.standard_rate_aud)),
          isShippingIncluded: false,
          hasFreeShipping: false,
        };
      }
    }

    const rates = await loadShippingRates();
    return resolveProductShippingDisplaySync({ ...input, rates });
  } catch (error) {
    console.error('[resolveProductShippingDisplay] Failed:', error);
    return { ...SHIPPING_DISPLAY_FALLBACK, ...withOrigin(input.vendor) };
  }
}
