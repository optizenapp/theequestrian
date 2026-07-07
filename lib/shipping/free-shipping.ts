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

export function resolveProductFreeShippingSync(input: {
  vendor: string;
  tags: string[];
  price?: number;
  rates: ShippingRates;
}): boolean {
  if (tagsIndicateFreeShipping(input.tags)) {
    return true;
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
}): Promise<boolean> {
  const rates = await loadShippingRates();
  return resolveProductFreeShippingSync({ ...input, rates });
}
