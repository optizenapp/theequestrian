import { getCollectiveShippingRateByProductId } from '@/lib/db/collective-shipping-rates';
import { isCollectiveProduct } from '@/lib/shipping/collective-vendors';
import {
  loadShippingRates,
  normalizeTags,
  resolveShippingOffset,
  type ShippingRates,
} from '@/lib/shipping/rates';

const FREE_SHIPPING_TAG_RE = /^#?free[-_ ]?shipping$/i;

/** Product tag explicitly marks free shipping (e.g. `free-shipping`). */
export function tagsIndicateFreeShipping(tags: string[]): boolean {
  return normalizeTags(tags).some((tag) => FREE_SHIPPING_TAG_RE.test(tag.trim()));
}

/**
 * Whether a product should show a FREE SHIPPING badge.
 *
 * Must stay aligned with `resolveProductShippingDisplay`:
 * - Explicit free-shipping tag → yes
 * - Collective: offset 0 means “don’t bake freight into price”, NOT free shipping.
 *   Only show when collective_shipping_rates.standard_rate_aud === 0 (async path).
 * - Non-collective: shippingOffset === 0 (includes free-shipping threshold) → yes
 */
export function resolveProductFreeShippingSync(input: {
  vendor: string;
  tags: string[];
  price?: number;
  rates: ShippingRates;
}): boolean {
  if (tagsIndicateFreeShipping(input.tags)) {
    return true;
  }

  // Collective: never treat vendor_shipping_rates offset 0 as free shipping.
  if (isCollectiveProduct({ vendor: input.vendor, tags: input.tags })) {
    return false;
  }

  const { shippingOffset } = resolveShippingOffset(
    input.vendor,
    input.tags,
    input.rates,
    undefined,
    input.price
  );

  return shippingOffset === 0;
}

export async function resolveProductFreeShipping(input: {
  vendor: string;
  tags: string[];
  price?: number;
  /** Shopify product GID or numeric id — used for Collective rate cache */
  productId?: string | null;
}): Promise<boolean> {
  if (tagsIndicateFreeShipping(input.tags)) {
    return true;
  }

  if (input.productId && isCollectiveProduct(input)) {
    try {
      const collective = await getCollectiveShippingRateByProductId(input.productId);
      if (collective) {
        return Number(collective.standard_rate_aud) === 0;
      }
    } catch (error) {
      console.error('[resolveProductFreeShipping] Collective rate lookup failed:', error);
    }
    // No cached rate (or lookup failed): do not claim free shipping for Collective.
    return false;
  }

  if (isCollectiveProduct({ vendor: input.vendor, tags: input.tags })) {
    return false;
  }

  const rates = await loadShippingRates();
  return resolveProductFreeShippingSync({ ...input, rates });
}
