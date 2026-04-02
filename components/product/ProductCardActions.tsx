'use client';

import { useMemo, useState } from 'react';
import { AddToCartButton } from './AddToCartButton';
import { BuyNowButton } from './BuyNowButton';
import { ProductCardQuickAddPanel, type QuickAddIntent } from './ProductCardQuickAddPanel';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import type { ShopifyProduct } from '@/types/shopify';
import { buildGa4ItemFromProduct } from '@/lib/analytics/ga4-ecommerce';

interface ProductCardActionsProps {
  product: ShopifyProduct;
  itemListId?: string;
  itemListName?: string;
  itemIndex?: number;
}

export function ProductCardActions({
  product,
  itemListId,
  itemListName,
  itemIndex,
}: ProductCardActionsProps) {
  const edges = product.variants?.edges ?? [];
  const [panelOpen, setPanelOpen] = useState(false);
  const [intent, setIntent] = useState<QuickAddIntent>('add_to_cart');
  const [quantity, setQuantity] = useState(1);

  const { selectedOptions, selectedVariant, handleOptionSelect, resetToDefaultOptions } =
    useProductVariantSelection(product);

  const currencyCode = product.priceRange.minVariantPrice.currencyCode;

  const panelAnalyticsItem = useMemo(() => {
    if (!selectedVariant) return null;
    return buildGa4ItemFromProduct(product, {
      variantId: selectedVariant.id,
      priceOverride: parseFloat(selectedVariant.price.amount),
      index: itemIndex,
      listId: itemListId,
      listName: itemListName,
    });
  }, [product, selectedVariant, itemIndex, itemListId, itemListName]);

  const closePanel = () => setPanelOpen(false);

  const variantId = selectedVariant?.id ?? '';
  const isAvailable = selectedVariant?.availableForSale ?? false;

  if (edges.length === 0) return null;

  if (edges.length === 1) {
    const node = edges[0].node;
    const singleAnalytics = buildGa4ItemFromProduct(product, {
      variantId: node.id,
      priceOverride: parseFloat(node.price.amount),
      index: itemIndex,
      listId: itemListId,
      listName: itemListName,
    });
    return (
      <div className="flex flex-row gap-2" onClick={(e) => e.stopPropagation()}>
        <AddToCartButton
          variantId={node.id}
          disabled={!node.availableForSale}
          analyticsItem={singleAnalytics}
          currencyCode={currencyCode}
          compact
        />
        <BuyNowButton
          variantId={node.id}
          disabled={!node.availableForSale}
          analyticsItem={singleAnalytics}
          currencyCode={currencyCode}
          compact
        />
      </div>
    );
  }

  const openPanel = (next: QuickAddIntent) => {
    resetToDefaultOptions();
    setQuantity(1);
    setIntent(next);
    setPanelOpen(true);
  };

  const multiDisabled = !product.availableForSale;

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {!panelOpen ? (
        <div className="flex flex-row gap-2">
          <button
            type="button"
            onClick={() => openPanel('add_to_cart')}
            disabled={multiDisabled}
            className="min-w-0 flex-1 rounded-full bg-action py-2.5 px-2 text-xs font-semibold text-white transition-all hover:bg-action-hover hover:-translate-y-0.5 hover:shadow-md sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:translate-y-0"
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={() => openPanel('buy_now')}
            disabled={multiDisabled}
            className="min-w-0 flex-1 rounded-full border border-gray-300 bg-transparent py-2.5 px-2 text-xs font-semibold text-action transition-all hover:border-action hover:-translate-y-0.5 active:scale-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Buy Now
          </button>
        </div>
      ) : (
        <ProductCardQuickAddPanel
          product={product}
          intent={intent}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
          variantId={variantId}
          isAvailable={isAvailable}
          quantity={quantity}
          onQuantityChange={setQuantity}
          analyticsItem={panelAnalyticsItem}
          currencyCode={currencyCode}
          onCancel={closePanel}
        />
      )}
    </div>
  );
}
