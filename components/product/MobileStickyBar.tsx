'use client';

import { useState, useEffect } from 'react';
import { ShopifyProduct } from '@/types/shopify';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';

interface MobileStickyBarProps {
  product: ShopifyProduct;
  selectedVariant: any;
  isAvailable: boolean;
}

/**
 * Mobile Sticky Bottom Bar
 * 
 * Appears on scroll (after 300px) on mobile devices
 * Shows FREE SHIPPING badge + Add to Cart + Buy Now buttons
 * Fixed at bottom of screen for easy access
 */
export function MobileStickyBar({ product, selectedVariant, isAvailable }: MobileStickyBarProps) {
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
    >
      <div className="p-3 space-y-2">
        {/* FREE SHIPPING Badge - Compact */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white px-2.5 py-1 rounded" style={{ backgroundColor: '#155dfb' }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
            FREE SHIPPING
          </span>
        </div>

        {/* Action Buttons - Compact */}
        <div className="space-y-2">
          {/* Wrap buttons to override their default styling */}
          <div className="[&>button]:py-2.5 [&>button]:text-base">
            <AddToCartButton
              variantId={selectedVariant?.id || ''}
              disabled={!isAvailable || !selectedVariant}
            />
          </div>
          
          <div className="[&>button]:py-2.5 [&>button]:text-base">
            <BuyNowButton
              variantId={selectedVariant?.id || ''}
              disabled={!isAvailable || !selectedVariant}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
