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
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold">
          ${parseFloat(price).toFixed(2)}
        </span>
        {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price) && (
          <>
            <span className="text-2xl text-gray-500 line-through">
              ${parseFloat(compareAtPrice).toFixed(2)}
            </span>
            <span className="text-lg text-red-600 font-semibold">
              Save ${(parseFloat(compareAtPrice) - parseFloat(price)).toFixed(2)}
            </span>
          </>
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

      {/* Additional Info */}
      <div className="text-sm text-gray-600 space-y-2 pt-4 border-t">
        <p>✓ Free shipping on orders over $100</p>
        <p>✓ Secure checkout</p>
        <p>✓ Easy returns within 30 days</p>
      </div>
    </div>
  );
}

