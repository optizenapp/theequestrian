'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { normalizeCheckoutUrl } from '@/lib/shopify/cart-utils';
import { trackGaEvent } from '@/lib/analytics/ga4';
import { redirectToDecoratedCheckout } from '@/lib/analytics/ga4-linker';
import type { Ga4EcommerceItem } from '@/lib/analytics/ga4-ecommerce';

interface BuyNowButtonProps {
  variantId: string;
  disabled?: boolean;
  analyticsItem?: Ga4EcommerceItem | null;
  currencyCode?: string;
  compact?: boolean;
  quantity?: number;
}

export function BuyNowButton({
  variantId,
  disabled,
  analyticsItem,
  currencyCode,
  compact = false,
  quantity = 1,
}: BuyNowButtonProps) {
  const { addCartItem } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuyNow = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default behavior that might cause page refresh
    e.preventDefault();
    e.stopPropagation();
    
    // Validate inputs
    if (disabled || !variantId) return;

    setIsProcessing(true);

    try {
      const qty = Math.max(1, Math.floor(quantity));
      const cart = await addCartItem(variantId, qty);

      // Validate cart response
      if (!cart || !cart.checkoutUrl) {
        throw new Error('Invalid cart response from Shopify');
      }

      const items = analyticsItem
        ? [{ ...analyticsItem, quantity: qty }]
        : [{ item_id: variantId, quantity: qty }];
      const currency = currencyCode || 'AUD';
      trackGaEvent('add_to_cart', { currency, items });
      trackGaEvent('begin_checkout', {
        currency,
        items,
        source: 'buy_now',
      });
      
      // Normalize and redirect to checkout
      const normalizedUrl = normalizeCheckoutUrl(cart.checkoutUrl);
      
      // Validate URL before redirecting
      try {
        new URL(normalizedUrl);
      } catch {
        throw new Error('Invalid checkout URL');
      }
      
      redirectToDecoratedCheckout(normalizedUrl);
    } catch (error) {
      console.error('Failed to process buy now:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process purchase';
      alert(`${errorMessage}. Please try again or contact support.`);
      setIsProcessing(false);
    }
  };

  const widthClass = compact ? 'flex-1 min-w-0' : 'w-full';
  const sizeClass = compact
    ? 'py-2.5 px-3 text-sm'
    : 'py-4 px-6 text-lg';

  return (
    <button
      onClick={(e) => {
        handleBuyNow(e);
      }}
      disabled={disabled || isProcessing}
      type="button"
      style={{ touchAction: 'manipulation' }}
      className={`${widthClass} ${sizeClass} rounded-full font-semibold transition-all border ${
        disabled || isProcessing
          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
          : 'bg-transparent text-action border-gray-300 hover:border-action hover:-translate-y-0.5 active:scale-95'
      }`}
      aria-label="Buy now and proceed to checkout"
    >
      {isProcessing ? 'Processing...' : 'Buy Now'}
    </button>
  );
}

