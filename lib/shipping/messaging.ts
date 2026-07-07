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

export const SHIPPING_TRUST_TITLE = 'Australia-wide Delivery';

export const SHIPPING_TRUST_DESCRIPTION = 'Rates vary by product';
