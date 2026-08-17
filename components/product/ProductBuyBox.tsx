'use client';

import { useMemo, useState } from 'react';
import type { ShopifyBuyBoxProduct } from '@/types/shopify';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';
import { MobileStickyBar } from './MobileStickyBar';
import { ProductBuyBoxPostCta } from './ProductBuyBoxPostCta';
import { ProductBuyBoxPriceAndBadges } from './ProductBuyBoxPriceAndBadges';
import { SizeChartModal, SizeChartTriggerButton } from '@/components/sizing/SizeChartModal';
import { buildGa4ItemFromProduct } from '@/lib/analytics/ga4-ecommerce';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import type { ProductShippingDisplay } from '@/lib/shipping/product-shipping-display';
import { SHIPPING_DISPLAY_FALLBACK } from '@/lib/shipping/product-shipping-display';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';
import { resolvedSizingHasContent } from '@/lib/sizing/types';

interface ProductBuyBoxProps {
  product: ShopifyBuyBoxProduct;
  /** CRO PDP trial: accurate trust copy, sale %, trust under CTAs, sticky ATC-only. */
  layout?: 'default' | 'croTrial' | 'croTheme3';
  shippingDisplay?: ProductShippingDisplay;
  /** Brand sizing for Size Chart modal next to size options. */
  sizing?: ResolvedBrandSizing | null;
}

function productHasSizeOption(product: ShopifyBuyBoxProduct): boolean {
  return product.variants.edges.some(({ node }) =>
    node.selectedOptions.some((opt) => {
      const n = opt.name.toLowerCase();
      return n === 'size' || n.includes('size');
    })
  );
}

export function ProductBuyBox({
  product,
  layout = 'default',
  shippingDisplay = SHIPPING_DISPLAY_FALLBACK,
  sizing = null,
}: ProductBuyBoxProps) {
  const { selectedOptions, selectedVariant, handleOptionSelect } = useProductVariantSelection(product);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const basePrice = selectedVariant?.price.amount || product.priceRange.minVariantPrice.amount;
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
  const sku = selectedVariant?.sku ?? product.variants.edges[0]?.node.sku ?? null;

  const showSizeChart = Boolean(sizing && resolvedSizingHasContent(sizing));
  const sizeChartAction = showSizeChart ? (
    <SizeChartTriggerButton onClick={() => setSizeChartOpen(true)} />
  ) : null;
  const hasSizeOption = productHasSizeOption(product);

  return (
    <div className="space-y-6">
      <ProductBuyBoxPriceAndBadges
        priceNum={priceNum}
        compareAmount={displayCompareAtPrice?.amount ?? null}
        onSale={onSale}
        saveAmount={saveAmount}
        savePercent={savePercent}
        layout={layout}
        currencyCode={currencyCode}
        sku={sku}
        shippingDisplay={shippingDisplay}
      />

      {product.variants.edges.length > 1 && (
        <ProductVariantSelector
          product={product}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
          styleMode={layout === 'croTheme3' ? 'croTheme3' : 'default'}
          sizeChartAction={sizeChartAction}
        />
      )}

      {/* No size option row (single-variant / colour-only) — still offer Size Chart */}
      {showSizeChart && !hasSizeOption ? (
        <div className="flex justify-end">{sizeChartAction}</div>
      ) : null}

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

      <ProductBuyBoxPostCta layout={layout} shippingDisplay={shippingDisplay} />

      <MobileStickyBar
        productTitle={product.title}
        selectedVariant={selectedVariant}
        isAvailable={isAvailable}
        analyticsItem={analyticsItem}
        currencyCode={currencyCode}
        showBuyNow={!isCro}
      />

      {showSizeChart && sizing ? (
        <SizeChartModal
          open={sizeChartOpen}
          onClose={() => setSizeChartOpen(false)}
          productTitle={product.title}
          sizing={sizing}
        />
      ) : null}
    </div>
  );
}
