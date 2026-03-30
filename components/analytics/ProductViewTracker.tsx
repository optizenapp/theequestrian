'use client';

import { useEffect, useRef } from 'react';
import { buildGa4ItemFromProduct, trackViewItem } from '@/lib/analytics/ga4-ecommerce';
import type { ShopifyProduct } from '@/types/shopify';

type ProductViewTrackerProps = {
  product: ShopifyProduct;
  displayTitle: string;
  defaultVariantId?: string;
  defaultVariantPrice?: number;
};

/** Fires GA4 `view_item` once on mount (PDP). */
export function ProductViewTracker({
  product,
  displayTitle,
  defaultVariantId,
  defaultVariantPrice,
}: ProductViewTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const currency = product.priceRange?.minVariantPrice?.currencyCode || 'AUD';
    const price =
      defaultVariantPrice ??
      parseFloat(product.priceRange?.minVariantPrice?.amount || '0');

    const item = buildGa4ItemFromProduct(product, {
      variantId: defaultVariantId,
      priceOverride: price,
      itemNameOverride: displayTitle,
    });

    trackViewItem({
      currency,
      value: price,
      items: [item],
    });
    // Intentionally once per mount; PDP props are fixed for the navigated product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
