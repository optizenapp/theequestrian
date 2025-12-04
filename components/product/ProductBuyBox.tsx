'use client';

import { useState, useMemo } from 'react';
import { ShopifyProduct } from '@/types/shopify';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';

interface ProductBuyBoxProps {
  product: ShopifyProduct;
}

export function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Find the selected variant based on selected options
  const selectedVariant = useMemo(() => {
    if (Object.keys(selectedOptions).length === 0) {
      return product.variants.edges[0]?.node;
    }

    return product.variants.edges.find(({ node: variant }) => {
      return variant.selectedOptions.every(
        (option) => selectedOptions[option.name] === option.value
      );
    })?.node;
  }, [selectedOptions, product.variants.edges]);

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const price = selectedVariant?.price.amount || product.priceRange.minVariantPrice.amount;
  const compareAtPrice = selectedVariant?.compareAtPrice?.amount;
  const isAvailable = selectedVariant?.availableForSale ?? true;

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-4xl font-bold text-gray-900">
            ${parseFloat(price).toFixed(2)}
          </span>
          {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price) && (
            <span className="text-lg text-gray-400 line-through font-medium">
              ${parseFloat(compareAtPrice).toFixed(2)}
            </span>
          )}
        </div>
        {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price) && (
          <div className="inline-block">
            <span className="px-3 py-1 rounded-md text-sm font-semibold text-gray-900" style={{ backgroundColor: '#94F5BD' }}>
              Save ${(parseFloat(compareAtPrice) - parseFloat(price)).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Variant Selector */}
      {product.variants.edges.length > 1 && (
        <ProductVariantSelector
          product={product}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
        />
      )}

      {/* Availability */}
      {!isAvailable && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Out of Stock</p>
          <p className="text-red-600 text-sm mt-1">
            This variant is currently unavailable
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <AddToCartButton
          variantId={selectedVariant?.id || ''}
          disabled={!isAvailable || !selectedVariant}
        />
        <BuyNowButton
          variantId={selectedVariant?.id || ''}
          disabled={!isAvailable || !selectedVariant}
        />
      </div>

      {/* Trust Signals */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Free shipping on orders over $100</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Secure checkout</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Easy returns within 30 days</span>
        </div>
      </div>
    </div>
  );
}

