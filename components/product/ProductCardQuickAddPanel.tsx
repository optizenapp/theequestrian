'use client';

import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import type { ShopifyProduct } from '@/types/shopify';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';
import type { Ga4EcommerceItem } from '@/lib/analytics/ga4-ecommerce';

export type QuickAddIntent = 'add_to_cart' | 'buy_now';

interface ProductCardQuickAddPanelProps {
  product: ShopifyProduct;
  intent: QuickAddIntent;
  selectedOptions: Record<string, string>;
  onOptionSelect: (optionName: string, value: string) => void;
  variantId: string;
  isAvailable: boolean;
  quantity: number;
  onQuantityChange: (next: number) => void;
  analyticsItem: Ga4EcommerceItem | null;
  currencyCode: string;
  onCancel: () => void;
}

const MIN_QTY = 1;
const MAX_QTY = 99;

export function ProductCardQuickAddPanel({
  product,
  intent,
  selectedOptions,
  onOptionSelect,
  variantId,
  isAvailable,
  quantity,
  onQuantityChange,
  analyticsItem,
  currencyCode,
  onCancel,
}: ProductCardQuickAddPanelProps) {
  const dec = () => onQuantityChange(Math.max(MIN_QTY, quantity - 1));
  const inc = () => onQuantityChange(Math.min(MAX_QTY, quantity + 1));

  return (
    <div
      className="mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
      role="region"
      aria-label="Choose options"
      onClick={(e) => e.stopPropagation()}
    >
      <ProductVariantSelector
        product={product}
        selectedOptions={selectedOptions}
        onOptionSelect={onOptionSelect}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700">Quantity</span>
        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={dec}
            disabled={quantity <= MIN_QTY}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-white disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={inc}
            disabled={quantity >= MAX_QTY}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-white disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-row gap-2 items-stretch">
        <div className="min-w-0 flex-1">
          {intent === 'add_to_cart' ? (
            <AddToCartButton
              variantId={variantId}
              disabled={!isAvailable || !variantId}
              analyticsItem={analyticsItem}
              currencyCode={currencyCode}
              compact
              quantity={quantity}
              onSuccess={onCancel}
            />
          ) : (
            <BuyNowButton
              variantId={variantId}
              disabled={!isAvailable || !variantId}
              analyticsItem={analyticsItem}
              currencyCode={currencyCode}
              compact
              quantity={quantity}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 self-center rounded-full border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
