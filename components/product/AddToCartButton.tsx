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
  /** Smaller padding and type — e.g. mobile sticky bar */
  compact?: boolean;
  quantity?: number;
  /** Called after a successful add (e.g. close quick-add panel) */
  onSuccess?: () => void;
}

export function AddToCartButton({
  variantId,
  disabled,
  analyticsItem,
  currencyCode,
  compact = false,
  quantity = 1,
  onSuccess,
}: AddToCartButtonProps) {
  const { addCartItem, openCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (disabled || !variantId) return;

    setIsAdding(true);
    try {
      const qty = Math.max(1, Math.floor(quantity));
      await addCartItem(variantId, qty);
      const items = analyticsItem
        ? [{ ...analyticsItem, quantity: qty }]
        : [{ item_id: variantId, quantity: qty }];
      trackGaEvent('add_to_cart', {
        ...(currencyCode ? { currency: currencyCode } : {}),
        items,
      });
      setShowSuccess(true);
      onSuccess?.();
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

  const widthClass = compact ? 'flex-1 min-w-0' : 'w-full';
  const sizeClass = compact
    ? 'py-2.5 px-3 text-sm'
    : 'py-4 px-6 text-lg';

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={`${widthClass} ${sizeClass} btn-atc ${
        showSuccess ? 'btn-atc-success' : ''
      }`}
    >
      {isAdding ? (
        'Adding...'
      ) : showSuccess ? (
        <span className="flex items-center justify-center gap-1">
          {compact ? '✓ Added' : '✓ Added to Cart'}
        </span>
      ) : (
        'Add to Cart'
      )}
    </button>
  );
}

