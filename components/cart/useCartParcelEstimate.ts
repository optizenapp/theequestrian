'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShopifyCart } from '@/types/shopify';

export type ParcelEstimateRow = {
  index: number;
  locationLabel: string;
  locationMapped: boolean;
  merchandiseTotal: number;
  shippingEstimate: number | null;
  freeShippingThreshold: number | null;
  amountToFreeShipping: number | null;
  lineIds: string[];
};

export type CartParcelEstimateState = {
  parcels: ParcelEstimateRow[];
  parcelCount: number;
  totalShippingEstimate: number | null;
  loading: boolean;
};

const EMPTY: CartParcelEstimateState = {
  parcels: [],
  parcelCount: 0,
  totalShippingEstimate: null,
  loading: false,
};

function linesPayloadKey(cart: ShopifyCart | null): string {
  if (!cart?.lines.edges.length) return '';
  return cart.lines.edges
    .map(({ node: line }) => {
      const vendor = line.merchandise.product?.vendor ?? '';
      const tags = (line.merchandise.product?.tags ?? []).join(',');
      const unit = parseFloat(line.merchandise.price.amount);
      const total = (Number.isFinite(unit) ? unit : 0) * line.quantity;
      return `${line.id}:${vendor}:${tags}:${total}:${line.quantity}`;
    })
    .join('|');
}

export function useCartParcelEstimate(cart: ShopifyCart | null): CartParcelEstimateState {
  const key = useMemo(() => linesPayloadKey(cart), [cart]);
  const [state, setState] = useState<CartParcelEstimateState>(EMPTY);

  useEffect(() => {
    if (!cart?.lines.edges.length || !key) {
      setState(EMPTY);
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true }));

    const lines = cart.lines.edges.map(({ node: line }) => {
      const unit = parseFloat(line.merchandise.price.amount);
      return {
        lineId: line.id,
        vendor: line.merchandise.product?.vendor ?? '',
        tags: line.merchandise.product?.tags ?? [],
        lineTotal: (Number.isFinite(unit) ? unit : 0) * line.quantity,
        quantity: line.quantity,
      };
    });

    (async () => {
      try {
        const res = await fetch('/api/cart/shipping-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setState(EMPTY);
          return;
        }
        const data = (await res.json()) as {
          parcels?: ParcelEstimateRow[];
          parcelCount?: number;
          totalShippingEstimate?: number | null;
        };
        setState({
          parcels: data.parcels ?? [],
          parcelCount: data.parcelCount ?? 0,
          totalShippingEstimate: data.totalShippingEstimate ?? null,
          loading: false,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('[useCartParcelEstimate]', e);
          setState(EMPTY);
        }
      }
    })();

    return () => controller.abort();
  }, [cart, key]);

  return state;
}
