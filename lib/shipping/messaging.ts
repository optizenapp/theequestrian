/** Sitewide shipping copy — no sitewide free-shipping claims. */
export const SHIPPING_CHECKOUT_MESSAGE =
  'Shipping rates vary by product and are calculated at checkout.';

export const SHIPPING_PRODUCT_FREE_MESSAGE = 'Free shipping on this item.';

/** Collective / vendor-offset model — shipping absorbed into listed price. */
export const SHIPPING_INCLUDED_MESSAGE = 'Shipping included in price.';

export function shippingThresholdMessage(threshold: number): string {
  const formatted = Number.isInteger(threshold) ? `$${threshold}` : `$${threshold.toFixed(2)}`;
  return `Free shipping on orders over ${formatted} from this seller.`;
}

function formatShippingRate(rate: number): string {
  return Number.isInteger(rate) ? `$${rate}` : `$${rate.toFixed(2)}`;
}

/** Per-vendor Collective shipping — rate hint without claiming shipping is included in price. */
export function vendorShippingCheckoutMessage(baseRate: number): string {
  return `Shipping from ${formatShippingRate(baseRate)} for this item — calculated at checkout.`;
}

export const SHIPPING_TRUST_TITLE = 'Australia-wide Delivery';

export const SHIPPING_TRUST_DESCRIPTION = 'Rates vary by product';

/** Cart / checkout sidebar — express shipping upsell as text, not a button. */
export const EXPRESS_SHIPPING_CHECKOUT_NOTE = 'Express shipping available at checkout.';

/** Cart — items may fulfil from multiple locations; checkout shows one combined shipping total. */
export const MULTI_ORIGIN_SHIPPING_CHECKOUT_NOTE =
  'Items may ship from different locations. Your shipping total at checkout may combine rates for each item.';
