'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';

interface AddToCartButtonProps {
  variantId: string;
  disabled?: boolean;
}

export function AddToCartButton({ variantId, disabled }: AddToCartButtonProps) {
  const { addCartItem, openCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (disabled || !variantId) return;

    setIsAdding(true);
    try {
      await addCartItem(variantId, 1);
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
      className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
        showSuccess
          ? 'bg-[#E91E8C] text-white'
          : disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-[#E91E8C] text-white hover:bg-[#d01a7d]'
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

