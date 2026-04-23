'use client';

import { useMemo } from 'react';
import { ShopifyProduct } from '@/types/shopify';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';
import { MobileStickyBar } from './MobileStickyBar';
import { ProductBuyBoxPostCta } from './ProductBuyBoxPostCta';
import { ProductBuyBoxPriceAndBadges } from './ProductBuyBoxPriceAndBadges';
import { buildGa4ItemFromProduct } from '@/lib/analytics/ga4-ecommerce';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';

interface ProductBuyBoxProps {
  product: ShopifyProduct;
  /** CRO PDP trial: accurate trust copy, sale %, trust under CTAs, sticky ATC-only. */
  layout?: 'default' | 'croTrial' | 'croTheme3';
}

export function ProductBuyBox({ product, layout = 'default' }: ProductBuyBoxProps) {
  const { selectedOptions, selectedVariant, handleOptionSelect } = useProductVariantSelection(product);

  const basePrice = selectedVariant?.price.amount || product.priceRange.minVariantPrice.amount;
  // Use variant-level compareAtPrice when available; fall back to product-level
  // compareAtPriceRange so the badge matches what the category card shows.
  const baseCompareAtPrice =
    selectedVariant?.compareAtPrice?.amount ??
    product.compareAtPriceRange?.minVariantPrice?.amount;
  const isAvailable = selectedVariant?.availableForSale ?? true;

  const displayPrice = {
    amount: basePrice,
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
  };
  const displayCompareAtPrice =
    baseCompareAtPrice && parseFloat(baseCompareAtPrice) > parseFloat(basePrice)
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
  const isCro = layout === 'croTrial' || layout === 'croTheme3';
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
        layout={layout}
      />

      {product.variants.edges.length > 1 && (
        <ProductVariantSelector
          product={product}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
          styleMode={layout === 'croTheme3' ? 'croTheme3' : 'default'}
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
