'use client';

import { useState, useMemo } from 'react';
import { ShopifyProduct } from '@/types/shopify';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';
import { MobileStickyBar } from './MobileStickyBar';
import { ProductBuyBoxPostCta } from './ProductBuyBoxPostCta';
import { ProductBuyBoxPriceAndBadges } from './ProductBuyBoxPriceAndBadges';
import { buildGa4ItemFromProduct } from '@/lib/analytics/ga4-ecommerce';

interface ProductBuyBoxProps {
  product: ShopifyProduct;
  /** CRO PDP trial: accurate trust copy, sale %, trust under CTAs, sticky ATC-only. */
  layout?: 'default' | 'croTrial';
}

export function ProductBuyBox({ product, layout = 'default' }: ProductBuyBoxProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const firstAvailableVariant = product.variants.edges.find(
      ({ node }) => node.availableForSale
    )?.node;
    const variantToSelect = firstAvailableVariant || product.variants.edges[0]?.node;
    if (!variantToSelect) return {};
    const initialOptions: Record<string, string> = {};
    variantToSelect.selectedOptions.forEach((option) => {
      initialOptions[option.name] = option.value;
    });
    return initialOptions;
  });

  const selectedVariant = useMemo(() => {
    if (Object.keys(selectedOptions).length === 0) {
      const firstAvailable = product.variants.edges.find(
        ({ node }) => node.availableForSale
      )?.node;
      return firstAvailable || product.variants.edges[0]?.node;
    }
    return product.variants.edges.find(({ node: variant }) =>
      variant.selectedOptions.every((option) => selectedOptions[option.name] === option.value)
    )?.node;
  }, [selectedOptions, product.variants.edges]);

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  };

  const basePrice = selectedVariant?.price.amount || product.priceRange.minVariantPrice.amount;
  const baseCompareAtPrice = selectedVariant?.compareAtPrice?.amount;
  const isAvailable = selectedVariant?.availableForSale ?? true;

  const displayPrice = {
    amount: basePrice,
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
  };
  const displayCompareAtPrice = baseCompareAtPrice
    ? { amount: baseCompareAtPrice, currencyCode: product.priceRange.minVariantPrice.currencyCode }
    : null;

  const analyticsItem = useMemo(() => {
    if (!selectedVariant) return null;
    return buildGa4ItemFromProduct(product, {
      variantId: selectedVariant.id,
      priceOverride: parseFloat(selectedVariant.price.amount),
    });
  }, [product, selectedVariant]);

  const currencyCode = product.priceRange.minVariantPrice.currencyCode;
  const isCro = layout === 'croTrial';
  const compareNum = displayCompareAtPrice ? parseFloat(displayCompareAtPrice.amount) : null;
  const priceNum = parseFloat(displayPrice.amount);
  const onSale = compareNum !== null && compareNum > priceNum;
  const saveAmount = onSale && compareNum !== null ? compareNum - priceNum : 0;
  const savePercent =
    onSale && compareNum !== null && compareNum > 0
      ? Math.round((saveAmount / compareNum) * 100)
      : null;

  return (
    <div className="space-y-6">
      <ProductBuyBoxPriceAndBadges
        priceNum={priceNum}
        compareAmount={displayCompareAtPrice?.amount ?? null}
        onSale={onSale}
        saveAmount={saveAmount}
        savePercent={savePercent}
        isCro={isCro}
      />

      {product.variants.edges.length > 1 && (
        <ProductVariantSelector
          product={product}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
        />
      )}

      {!isAvailable && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Out of Stock</p>
          <p className="text-red-600 text-sm mt-1">This variant is currently unavailable</p>
        </div>
      )}

      <div className="space-y-3">
        <AddToCartButton
          variantId={selectedVariant?.id || ''}
          disabled={!isAvailable || !selectedVariant}
          analyticsItem={analyticsItem}
          currencyCode={currencyCode}
        />
        <BuyNowButton
          variantId={selectedVariant?.id || ''}
          disabled={!isAvailable || !selectedVariant}
          analyticsItem={analyticsItem}
          currencyCode={currencyCode}
        />
      </div>

      <ProductBuyBoxPostCta layout={layout} />

      <MobileStickyBar
        product={product}
        selectedVariant={selectedVariant}
        isAvailable={isAvailable}
        analyticsItem={analyticsItem}
        currencyCode={currencyCode}
        showBuyNow={!isCro}
        variant={isCro ? 'croTrial' : 'default'}
      />
    </div>
  );
}
