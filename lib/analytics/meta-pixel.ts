'use client';

import {
  isMetaStorefrontInitiateCheckoutEnabled,
  isMetaStorefrontTrackingEnabled,
} from '@/lib/analytics/meta-pixel-config';
import {
  createMetaEventId,
  normalizeShopifyNumericId,
  parseMajorUnitAmount,
} from '@/lib/analytics/meta-pixel-ids';
import { getMetaFbq } from '@/lib/analytics/meta-pixel-stub';

export type MetaCatalogContent = {
  id: string;
  quantity: number;
  item_price: number;
};

const MAX_QUEUE = 20;
const pending: Array<{ event: string; params: Record<string, unknown>; eventID: string }> = [];

function dispatch(event: string, params: Record<string, unknown>, eventID: string) {
  const fbq = getMetaFbq();
  if (!fbq || typeof fbq !== 'function') {
    if (pending.length >= MAX_QUEUE) pending.shift();
    pending.push({ event, params, eventID });
    return;
  }
  try {
    // Single-pixel storefront: `track` is enough and does not depend on client env inlining.
    fbq('track', event, params, { eventID });
  } catch {
    // Tracking must never break shopping.
  }
}

export function flushMetaPixelQueue() {
  if (!getMetaFbq()) return;
  while (pending.length > 0) {
    const next = pending.shift();
    if (!next) break;
    dispatch(next.event, next.params, next.eventID);
  }
}

export function clearMetaPixelQueue() {
  pending.length = 0;
}

function catalogParams(input: {
  contentIds: string[];
  contents: MetaCatalogContent[];
  value: number;
  currency: string;
}): Record<string, unknown> | null {
  if (input.contentIds.length === 0 || input.contents.length === 0) return null;
  if (!Number.isFinite(input.value) || input.value < 0) return null;
  const currency = input.currency.trim().toUpperCase();
  if (currency.length !== 3) return null;
  return {
    content_type: 'product',
    content_ids: input.contentIds,
    contents: input.contents,
    value: input.value,
    currency,
  };
}

export function trackMetaPageView() {
  if (!isMetaStorefrontTrackingEnabled() && !(typeof window !== 'undefined' && window.fbq)) return;
  dispatch('PageView', {}, createMetaEventId());
}

export function trackMetaViewContent(input: {
  variantId: string;
  quantity?: number;
  unitPrice: number | string;
  currency: string;
}) {
  // Allow when bootstrap marked tracking on, or fbq already exists from layout snippet.
  if (!isMetaStorefrontTrackingEnabled() && !(typeof window !== 'undefined' && typeof window.fbq === 'function')) {
    return;
  }
  const id = normalizeShopifyNumericId(input.variantId);
  const price = parseMajorUnitAmount(input.unitPrice);
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  if (!id || price == null) return;
  const params = catalogParams({
    contentIds: [id],
    contents: [{ id, quantity, item_price: price }],
    value: price * quantity,
    currency: input.currency,
  });
  if (!params) return;
  dispatch('ViewContent', params, createMetaEventId());
}

export function trackMetaAddToCart(input: {
  variantId: string;
  quantity: number;
  unitPrice: number | string;
  currency: string;
}) {
  if (!isMetaStorefrontTrackingEnabled() && !(typeof window !== 'undefined' && typeof window.fbq === 'function')) {
    return;
  }
  const id = normalizeShopifyNumericId(input.variantId);
  const price = parseMajorUnitAmount(input.unitPrice);
  const quantity = Math.floor(input.quantity);
  if (!id || price == null || quantity < 1) return;
  const params = catalogParams({
    contentIds: [id],
    contents: [{ id, quantity, item_price: price }],
    value: price * quantity,
    currency: input.currency,
  });
  if (!params) return;
  dispatch('AddToCart', params, createMetaEventId());
}

/** Gated off until checkout-event ownership is resolved. */
export function trackMetaInitiateCheckout(input: {
  contents: MetaCatalogContent[];
  value: number;
  currency: string;
}) {
  if (!isMetaStorefrontInitiateCheckoutEnabled()) return;
  const contentIds = input.contents.map((row) => row.id);
  const params = catalogParams({
    contentIds,
    contents: input.contents,
    value: input.value,
    currency: input.currency,
  });
  if (!params) return;
  dispatch('InitiateCheckout', params, createMetaEventId());
}
