'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { trackGaEvent } from '@/lib/analytics/ga4';
import type { Ga4EcommerceItem } from '@/lib/analytics/ga4-ecommerce';

interface AddToCartButtonProps {
  variantId: string;
  disabled?: boolean;
  /** Full item row for GA4 / BigQuery joins (falls back to variant id only) */
  analyticsItem?: Ga4EcommerceItem | null;
  currencyCode?: string;
}

export function AddToCartButton({
  variantId,
  disabled,
  analyticsItem,
  currencyCode,
}: AddToCartButtonProps) {
  const { addCartItem, openCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (disabled || !variantId) return;

    setIsAdding(true);
    try {
      await addCartItem(variantId, 1);
      const items = analyticsItem
        ? [{ ...analyticsItem, quantity: 1 }]
        : [{ item_id: variantId, quantity: 1 }];
      trackGaEvent('add_to_cart', {
        ...(currencyCode ? { currency: currencyCode } : {}),
        items,
      });
      setShowSuccess(true);
      openCart();
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={`w-full py-4 px-6 rounded-full font-semibold text-lg transition-all ${
        showSuccess
          ? 'bg-[#E91E8C] text-white'
          : disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-action text-white hover:bg-action-hover hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {isAdding ? (
        'Adding...'
      ) : showSuccess ? (
        <span className="flex items-center justify-center gap-2">
          ✓ Added to Cart
        </span>
      ) : (
        'Add to Cart'
      )}
    </button>
  );
}

