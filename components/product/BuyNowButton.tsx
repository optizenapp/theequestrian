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

  const handleBuyNow = async () => {
    if (disabled || !variantId) return;

    setIsProcessing(true);
    try {
      const cart = await addCartItem(variantId, 1);
      trackGaEvent('add_to_cart', {
        items: [{ item_id: variantId, quantity: 1 }],
      });
      trackGaEvent('begin_checkout', {
        items: [{ item_id: variantId, quantity: 1 }],
        source: 'buy_now',
      });
      // Redirect to Shopify checkout (normalized to use proper checkout domain)
      window.location.href = normalizeCheckoutUrl(cart.checkoutUrl);
    } catch (error) {
      console.error('Failed to process buy now:', error);
      alert('Failed to process purchase. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleBuyNow}
      disabled={disabled || isProcessing}
      className={`w-full py-4 px-6 rounded-full font-semibold text-lg transition-all border ${
        disabled
          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
          : 'bg-transparent text-action border-gray-300 hover:border-action hover:-translate-y-0.5'
      }`}
    >
      {isProcessing ? 'Processing...' : 'Buy Now'}
    </button>
  );
}

