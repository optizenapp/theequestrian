'use client';

import { useEffect, useState, type RefObject } from 'react';
import type { ShopifyVariant } from '@/types/shopify';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';
import type { Ga4EcommerceItem } from '@/lib/analytics/ga4-ecommerce';

interface MobileStickyBarProps {
  productTitle: string;
  selectedVariant: ShopifyVariant | null | undefined;
  isAvailable: boolean;
  analyticsItem?: Ga4EcommerceItem | null;
  currencyCode?: string;
  showBuyNow?: boolean;
  /** Main Add to Cart block — sticky shows only after this scrolls off the top. */
  anchorRef: RefObject<HTMLElement | null>;
}

export function MobileStickyBar({
  productTitle,
  selectedVariant,
  isAvailable,
  analyticsItem,
  currencyCode,
  showBuyNow = true,
  anchorRef,
}: MobileStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrolledOffTop = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setIsVisible(scrolledOffTop);
      },
      { threshold: 0, rootMargin: '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={`${productTitle} — quick add to cart`}
    >
      <div className="px-2 py-2">
        <div className={showBuyNow ? 'flex flex-row gap-2' : 'flex flex-col'}>
          <AddToCartButton
            variantId={selectedVariant?.id || ''}
            disabled={!isAvailable || !selectedVariant}
            analyticsItem={analyticsItem}
            currencyCode={currencyCode}
            compact={showBuyNow}
          />

          {showBuyNow ? (
            <BuyNowButton
              variantId={selectedVariant?.id || ''}
              disabled={!isAvailable || !selectedVariant}
              analyticsItem={analyticsItem}
              currencyCode={currencyCode}
              compact
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
