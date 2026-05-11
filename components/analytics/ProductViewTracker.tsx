'use client';

import { useEffect, useRef } from 'react';
import { stripShopifyGid, trackViewItem } from '@/lib/analytics/ga4-ecommerce';

type ProductViewTrackerProps = {
  productId: string;
  productTitle: string;
  productVendor: string;
  productType: string;
  productPriceAmount: string;
  productPriceCurrencyCode: string;
  displayTitle: string;
  defaultVariantId?: string;
  defaultVariantPrice?: number;
};

/** Fires GA4 `view_item` once on mount (PDP). */
export function ProductViewTracker({
  productId,
  productTitle,
  productVendor,
  productType,
  productPriceAmount,
  productPriceCurrencyCode,
  displayTitle,
  defaultVariantId,
  defaultVariantPrice,
}: ProductViewTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const currency = productPriceCurrencyCode || 'AUD';
    const price =
      defaultVariantPrice ??
      parseFloat(productPriceAmount || '0');

    const item = {
      item_id: stripShopifyGid(productId),
      item_name: displayTitle || productTitle,
      item_brand: productVendor || undefined,
      item_category: productType || undefined,
      ...(defaultVariantId ? { item_variant: stripShopifyGid(defaultVariantId) } : {}),
      price,
      quantity: 1,
    };

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
