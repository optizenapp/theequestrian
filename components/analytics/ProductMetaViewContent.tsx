'use client';

import { useEffect, useRef } from 'react';
import { trackMetaViewContent } from '@/lib/analytics/meta-pixel';

type ProductMetaViewContentProps = {
  productId: string;
  selectionReady: boolean;
  variantId: string | null | undefined;
  unitPrice: string | number | null | undefined;
  currency: string;
};

/** One ViewContent per PDP navigation + one per committed variant change. */
export function ProductMetaViewContent({
  productId,
  selectionReady,
  variantId,
  unitPrice,
  currency,
}: ProductMetaViewContentProps) {
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastIdRef.current = null;
  }, [productId]);

  useEffect(() => {
    if (!selectionReady || !variantId) return;
    if (lastIdRef.current === variantId) return;
    lastIdRef.current = variantId;
    trackMetaViewContent({
      variantId,
      unitPrice: unitPrice ?? '',
      currency,
    });
  }, [selectionReady, variantId, unitPrice, currency]);

  return null;
}
