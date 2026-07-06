'use client';

import { useState, useEffect } from 'react';
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
  /** When false, sticky bar is Add to Cart only (CRO trial). Default true. */
  showBuyNow?: boolean;
}

/**
 * Mobile Sticky Bottom Bar
 * 
 * Appears on scroll (after 300px) on mobile devices
 * Shows Add to Cart (+ optional Buy Now)
 * Fixed at bottom of screen for easy access
 */
export function MobileStickyBar({
  productTitle,
  selectedVariant,
  isAvailable,
  analyticsItem,
  currencyCode,
  showBuyNow = true,
}: MobileStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Debounce scroll events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Show after scrolling 300px down
        setIsVisible(window.scrollY > 300);
      }, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll position
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

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
