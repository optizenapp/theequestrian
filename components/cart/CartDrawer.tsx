'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from './cart-context';
import Image from 'next/image';
import Link from 'next/link';
import { normalizeCheckoutUrl } from '@/lib/shopify/cart-utils';
import { trackGaEvent } from '@/lib/analytics/ga4';
import { bindDecoratedCheckoutLink } from '@/lib/analytics/ga4-linker';
import {
  multiParcelDrawerNote,
  SHIPPING_ESTIMATE_CHECKOUT_NOTE,
  singleParcelArrivesCopy,
} from '@/lib/shipping/messaging';
import { formatShippingMoney } from '@/components/cart/format-shipping-money';
import { useCartParcelEstimate } from '@/components/cart/useCartParcelEstimate';

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateCartItem, removeCartItem } = useCart();
  const [productHrefByHandle, setProductHrefByHandle] = useState<Record<string, string>>({});
  const checkoutLinkRef = useRef<HTMLAnchorElement | null>(null);
  const estimate = useCartParcelEstimate(isOpen ? cart : null);
  const viewedKeyRef = useRef('');

  const handlesKey = useMemo(() => {
    const handles =
      cart?.lines.edges
        .map(({ node: line }) => line.merchandise.product?.handle)
        .filter((h): h is string => Boolean(h)) ?? [];
    return [...new Set(handles)].sort().join('\0');
  }, [cart?.lines.edges]);

  useEffect(() => {
    if (!handlesKey) {
      setProductHrefByHandle({});
      return;
    }
    const handles = handlesKey.split('\0');
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/products/canonical-hrefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handles }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { hrefs?: Record<string, string> };
        if (data.hrefs) setProductHrefByHandle(data.hrefs);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('[CartDrawer] canonical hrefs', e);
        }
      }
    })();
    return () => controller.abort();
  }, [handlesKey]);

  const itemCount = cart?.totalQuantity || 0;
  const subtotal = cart?.cost.subtotalAmount.amount || '0';
  const currencyCode = cart?.cost.subtotalAmount.currencyCode || 'AUD';
  const checkoutHref =
    cart && cart.lines.edges.length > 0 ? normalizeCheckoutUrl(cart.checkoutUrl) : '';

  useEffect(() => {
    if (!isOpen || !cart || estimate.parcelCount < 1) return;
    const key = `${cart.id}:${estimate.parcelCount}:${cart.totalQuantity}`;
    if (viewedKeyRef.current === key) return;
    viewedKeyRef.current = key;
    trackGaEvent('view_cart', {
      currency: currencyCode,
      value: parseFloat(subtotal),
      item_count: itemCount,
      parcel_count: estimate.parcelCount,
      source: 'cart_drawer',
    });
  }, [isOpen, cart, estimate.parcelCount, currencyCode, subtotal, itemCount]);

  useEffect(() => {
    if (!isOpen) return;
    const link = checkoutLinkRef.current;
    if (!link || !checkoutHref) return;

    return bindDecoratedCheckoutLink(link, {
      source: 'cart_drawer',
      cartId: cart?.id,
      onPlainLeftClick: () =>
        trackGaEvent('begin_checkout', {
          currency: currencyCode,
          value: parseFloat(subtotal),
          item_count: itemCount,
          parcel_count: estimate.parcelCount,
          source: 'cart_drawer',
        }),
    });
  }, [isOpen, checkoutHref, currencyCode, itemCount, subtotal, cart?.id, estimate.parcelCount]);

  const hrefFor = (handle: string) => productHrefByHandle[handle] ?? `/products/${handle}`;
  const lineById = useMemo(() => {
    const map = new Map<string, (typeof cart extends null ? never : NonNullable<typeof cart>['lines']['edges'][number]['node'])>();
    for (const { node } of cart?.lines.edges ?? []) map.set(node.id, node);
    return map;
  }, [cart?.lines.edges]);

  if (!isOpen) return null;

  const multi = estimate.parcelCount > 1;
  const single = estimate.parcels[0];
  const drawerNote = multi ? multiParcelDrawerNote(estimate.parcelCount) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={closeCart} aria-hidden />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-bold text-gray-900">Cart ({itemCount})</h2>
          <button type="button" onClick={closeCart} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close cart">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!cart || cart.lines.edges.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="mb-3 text-gray-500">Your cart is empty</p>
              <button type="button" onClick={closeCart} className="text-sm font-medium text-action hover:underline">
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {!multi && single && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">
                    {singleParcelArrivesCopy(single.locationLabel, single.locationMapped).replace(/\.$/, '')}
                  </span>
                </p>
              )}
              {(estimate.parcels.length > 0 ? estimate.parcels : [{ index: 1, locationLabel: '', locationMapped: false, warehouseSlug: null, shippingEstimate: null, lineIds: cart.lines.edges.map((e) => e.node.id), merchandiseTotal: 0 }]).map((parcel) => (
                <div key={parcel.lineIds.join('-') || String(parcel.index)} className="space-y-1">
                  {multi && (
                    <div className="mb-2 border-b border-gray-100 pb-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Parcel {parcel.index} of {estimate.parcelCount} · from {parcel.locationLabel} · Est. 1–2 business days
                      </p>
                      <p className="text-xs text-gray-600">
                        Shipping: <span className="font-semibold">{formatShippingMoney(parcel.shippingEstimate)}</span>
                      </p>
                    </div>
                  )}
                  <ul className="divide-y divide-gray-100">
                    {parcel.lineIds.map((lineId) => {
                      const line = lineById.get(lineId);
                      if (!line) return null;
                      const product = line.merchandise.product;
                      const image = product?.images.edges[0]?.node;
                      const variantLabel =
                        line.merchandise.title !== 'Default Title' ? line.merchandise.title : null;
                      const linePrice = parseFloat(line.merchandise.price.amount);
                      return (
                        <li key={line.id} className="flex gap-3 py-3 first:pt-0">
                          {image && product ? (
                            <Link href={hrefFor(product.handle)} onClick={closeCart} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                              <Image src={image.url} alt={image.altText || product.title} fill className="object-cover" sizes="64px" />
                            </Link>
                          ) : (
                            <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              {product ? (
                                <Link href={hrefFor(product.handle)} onClick={closeCart} className="line-clamp-2 text-sm font-medium leading-snug text-gray-900 hover:text-action">
                                  {product.title}
                                </Link>
                              ) : (
                                <span className="text-sm font-medium text-gray-900">{line.merchandise.title}</span>
                              )}
                              <span className="shrink-0 text-sm font-semibold text-gray-900">${linePrice.toFixed(2)}</span>
                            </div>
                            {variantLabel && <p className="mt-0.5 truncate text-xs text-gray-500">{variantLabel}</p>}
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex items-center rounded-full border border-gray-200 text-xs">
                                <button type="button" onClick={() => { if (line.quantity > 1) updateCartItem(line.id, line.quantity - 1); }} disabled={line.quantity <= 1} className="flex h-7 w-7 items-center justify-center hover:bg-gray-50 disabled:opacity-40" aria-label="Decrease quantity">−</button>
                                <span className="min-w-[1.25rem] text-center font-medium">{line.quantity}</span>
                                <button type="button" onClick={() => updateCartItem(line.id, line.quantity + 1)} className="flex h-7 w-7 items-center justify-center hover:bg-gray-50" aria-label="Increase quantity">+</button>
                              </div>
                              <button type="button" onClick={() => removeCartItem(line.id)} className="text-xs text-gray-500 hover:text-gray-900 hover:underline">Remove</button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart && cart.lines.edges.length > 0 && (
          <div className="shrink-0 border-t bg-white px-4 py-4">
            {drawerNote && (
              <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
                <p className="font-semibold text-gray-900">{drawerNote.title}</p>
                <p className="mt-1">
                  {drawerNote.body}{' '}
                  <Link href="/shipping-delivery" onClick={closeCart} className="font-medium text-action hover:underline">
                    Why?
                  </Link>
                </p>
              </div>
            )}
            {multi && estimate.parcels.length > 0 && (
              <div className="mb-3 space-y-1 text-xs text-gray-600">
                {estimate.parcels.map((p) => (
                  <div key={p.index} className="flex justify-between gap-2">
                    <span>Parcel {p.index} — {p.locationLabel}</span>
                    <span className="font-medium text-gray-900">{formatShippingMoney(p.shippingEstimate)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold text-gray-900">
                  <span>Total shipping</span>
                  <span>{formatShippingMoney(estimate.totalShippingEstimate)}</span>
                </div>
              </div>
            )}
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-700">Subtotal</span>
              <span className="text-base font-bold text-gray-900">${parseFloat(subtotal).toFixed(2)} {currencyCode}</span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-500">{SHIPPING_ESTIMATE_CHECKOUT_NOTE} Taxes calculated at checkout.</p>
            <a ref={checkoutLinkRef} href={checkoutHref} className="block w-full rounded-full bg-action py-2.5 text-center text-sm font-semibold text-white hover:bg-action-hover transition-colors">Checkout</a>
            <Link href="/cart" onClick={closeCart} className="mt-2 block text-center text-xs font-medium text-gray-600 hover:text-action hover:underline">View full cart</Link>
          </div>
        )}
      </div>
    </>
  );
}
