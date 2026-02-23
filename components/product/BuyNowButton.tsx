'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { normalizeCheckoutUrl } from '@/lib/shopify/cart-utils';
import { trackGaEvent } from '@/lib/analytics/ga4';

interface BuyNowButtonProps {
  variantId: string;
  disabled?: boolean;
}

export function BuyNowButton({ variantId, disabled }: BuyNowButtonProps) {
  const { addCartItem } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuyNow = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default behavior that might cause page refresh
    e.preventDefault();
    e.stopPropagation();
    
    // Validate inputs
    if (disabled || !variantId) {
      console.error('Buy Now button clicked but disabled or no variant', { disabled, variantId });
      return;
    }

    console.log('Buy Now: Starting checkout process', { variantId });
    setIsProcessing(true);
    
    try {
      // Add item to cart
      const cart = await addCartItem(variantId, 1);
      
      // Validate cart response
      if (!cart || !cart.checkoutUrl) {
        throw new Error('Invalid cart response from Shopify');
      }
      
      // Track analytics
      trackGaEvent('add_to_cart', {
        items: [{ item_id: variantId, quantity: 1 }],
      });
      trackGaEvent('begin_checkout', {
        items: [{ item_id: variantId, quantity: 1 }],
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
      
      // Redirect to checkout
      window.location.href = normalizedUrl;
    } catch (error) {
      console.error('Failed to process buy now:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process purchase';
      alert(`${errorMessage}. Please try again or contact support.`);
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        console.log('Buy Now button clicked!');
        handleBuyNow(e);
      }}
      disabled={disabled || isProcessing}
      type="button"
      style={{ touchAction: 'manipulation' }}
      className={`w-full py-4 px-6 rounded-full font-semibold text-lg transition-all border ${
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

