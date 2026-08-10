/** Sitewide shipping copy — no sitewide free-shipping claims. */
export const SHIPPING_CHECKOUT_MESSAGE =
  'Shipping rates vary by product and are calculated at checkout.';

export const SHIPPING_PRODUCT_FREE_MESSAGE = 'Free shipping on this item.';

/** Collective / vendor-offset model — shipping absorbed into listed price. */
export const SHIPPING_INCLUDED_MESSAGE = 'Shipping included in price.';

export function shippingThresholdMessage(threshold: number): string {
  const formatted = Number.isInteger(threshold) ? `$${threshold}` : `$${threshold.toFixed(2)}`;
  return `Free shipping on orders over ${formatted} from this warehouse.`;
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

export const SHIPPING_DISPATCH_LINE = 'Dispatched in 1–2 business days · Australia-wide';

export const HOW_SHIPPING_WORKS_SUMMARY = 'How our shipping works';

export const HOW_SHIPPING_WORKS_BODY = [
  'We hold stock in warehouses across Australia and each item ships direct from the one that stocks it, so it reaches you faster.',
  'If you order items held in different warehouses, they arrive as separate parcels and each parcel has its own shipping rate. You\'ll see every parcel and every rate itemised in your cart before you pay — no surprises at checkout.',
  'It\'s the same freight you\'d pay buying from each store on its own. The difference is you only check out once.',
] as const;

export function shipsFromWarehouseHeadline(locationLabel: string, mapped: boolean): string {
  if (mapped) {
    return `Ships direct from our ${locationLabel} warehouse`;
  }
  return `Ships direct from ${locationLabel}`;
}

export function shipsFromWarehouseCompact(locationLabel: string, mapped: boolean): string {
  if (mapped) {
    return `Ships direct from our ${locationLabel} warehouse`;
  }
  return `Ships direct from ${locationLabel}`;
}

export function singleParcelArrivesCopy(locationLabel: string, mapped: boolean): string {
  if (mapped) {
    return `Arrives in one parcel — from our ${locationLabel} warehouse.`;
  }
  return `Arrives in one parcel — from ${locationLabel}.`;
}

export function multiParcelOrderBanner(parcelCount: number): { title: string; body: string } {
  return {
    title: `One cart, one checkout — ${parcelCount} parcels on the way.`,
    body: 'We stock across multiple Australian warehouses so your gear ships direct from wherever it\'s held, instead of being trucked to a central depot first. Each parcel carries its own shipping rate, itemised below.',
  };
}

export function multiParcelDrawerNote(parcelCount: number): { title: string; body: string } {
  return {
    title: `Your order ships in ${parcelCount} parcels — one from each warehouse.`,
    body: 'Each parcel is charged its own rate. It\'s the same freight as ordering from both stores separately — you just check out once.',
  };
}

export function freeShippingNudgeCopy(amountRemaining: number): string {
  const formatted =
    Number.isInteger(amountRemaining)
      ? `$${amountRemaining}`
      : `$${amountRemaining.toFixed(2)}`;
  return `Add ${formatted} more from this warehouse for free shipping on this parcel.`;
}

export function whyMultipleRatesTitle(parcelCount: number): string {
  return `Why am I paying ${parcelCount} shipping rates?`;
}

export const WHY_MULTIPLE_RATES_BODY = [
  'Because you\'re getting separate parcels, from different warehouses, and each one has to be freighted to you.',
  'The alternative isn\'t one cheaper parcel — it\'s placing separate orders on separate websites and paying each rate anyway, plus multiple sets of account details, confirmation emails and people to chase if something goes astray.',
  'Here, it\'s one cart, one payment, one order to track. And because each item leaves the warehouse that actually holds it, nothing waits around for the rest of your order to catch up. Your parcels may well arrive on different days — usually that means the first one arrives sooner than it otherwise would have.',
] as const;

export const SHIPPING_ESTIMATE_CHECKOUT_NOTE =
  'Final shipping is confirmed at checkout. Rates above are estimates per parcel.';
