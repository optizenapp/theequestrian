'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';

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
      // Redirect to Shopify checkout
      window.location.href = cart.checkoutUrl;
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
      className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all border-2 ${
        disabled
          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
          : 'bg-white text-[#E91E8C] border-[#E91E8C] hover:bg-[#E91E8C] hover:text-white'
      }`}
    >
      {isProcessing ? 'Processing...' : 'Buy Now'}
    </button>
  );
}

