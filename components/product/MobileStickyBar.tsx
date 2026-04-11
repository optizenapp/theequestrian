'use client';

import { useState, useEffect } from 'react';
import { ShopifyProduct } from '@/types/shopify';
import type { ShopifyVariant } from '@/types/shopify';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';

import type { Ga4EcommerceItem } from '@/lib/analytics/ga4-ecommerce';

interface MobileStickyBarProps {
  product: ShopifyProduct;
  selectedVariant: ShopifyVariant | null | undefined;
  isAvailable: boolean;
  analyticsItem?: Ga4EcommerceItem | null;
  currencyCode?: string;
  /** When false, sticky bar is Add to Cart only (CRO trial). Default true. */
  showBuyNow?: boolean;
  /** CRO trial uses accurate shipping copy and optional single CTA. */
  variant?: 'default' | 'croTrial';
}

/**
 * Mobile Sticky Bottom Bar
 * 
 * Appears on scroll (after 300px) on mobile devices
 * Shows shipping note + Add to Cart (+ optional Buy Now)
 * Fixed at bottom of screen for easy access
 */
export function MobileStickyBar({
  product,
  selectedVariant,
  isAvailable,
  analyticsItem,
  currencyCode,
  showBuyNow = true,
  variant = 'default',
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
      aria-label={`${product.title} — quick add to cart`}
    >
      <div className="px-2 pt-2 pb-1 space-y-1">
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center justify-center gap-0.5 text-[10px] font-bold text-white px-2 py-0.5 rounded-full text-center leading-snug ${
              variant === 'croTrial' ? 'max-w-[min(100%,17rem)]' : 'uppercase tracking-wide'
            }`}
            style={{ backgroundColor: '#155dfb' }}
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
            FREE SHIPPING
          </span>
        </div>

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
