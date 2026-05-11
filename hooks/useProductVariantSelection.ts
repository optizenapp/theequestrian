'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ShopifyBuyBoxProduct, ShopifyVariant } from '@/types/shopify';

function byPriceAsc(a: ShopifyVariant, b: ShopifyVariant): number {
  return parseFloat(a.price.amount) - parseFloat(b.price.amount);
}

function isOnSale(v: ShopifyVariant): boolean {
  return (
    v.compareAtPrice != null &&
    parseFloat(v.compareAtPrice.amount) > parseFloat(v.price.amount)
  );
}

function getVariantNodes(product: ShopifyBuyBoxProduct): ShopifyVariant[] {
  const edges = product.variants?.edges;
  if (!Array.isArray(edges)) return [];
  return edges.map((edge) => edge.node);
}

function findBestDefaultVariant(product: ShopifyBuyBoxProduct): ShopifyVariant | undefined {
  const variants = getVariantNodes(product);
  if (variants.length === 0) return undefined;
  const inStock = variants.filter((v) => v.availableForSale);

  // 1. Cheapest discounted in-stock variant
  const discountedInStock = inStock.filter(isOnSale).sort(byPriceAsc);
  if (discountedInStock.length > 0) return discountedInStock[0];

  // 2. Cheapest in-stock variant
  const cheapestInStock = [...inStock].sort(byPriceAsc);
  if (cheapestInStock.length > 0) return cheapestInStock[0];

  // 3. Cheapest overall (all variants out of stock)
  return [...variants].sort(byPriceAsc)[0];
}

export function buildInitialSelectedOptions(product: ShopifyBuyBoxProduct): Record<string, string> {
  const variantToSelect = findBestDefaultVariant(product);
  if (!variantToSelect) return {};
  const initialOptions: Record<string, string> = {};
  variantToSelect.selectedOptions.forEach((option) => {
    initialOptions[option.name] = option.value;
  });
  return initialOptions;
}

export function useProductVariantSelection(product: ShopifyBuyBoxProduct) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    buildInitialSelectedOptions(product)
  );
  const variantNodes = useMemo(() => getVariantNodes(product), [product]);

  const selectedVariant = useMemo((): ShopifyVariant | undefined => {
    if (Object.keys(selectedOptions).length === 0) {
      return findBestDefaultVariant(product);
    }
    return variantNodes.find((variant) =>
      variant.selectedOptions.every((option) => selectedOptions[option.name] === option.value)
    );
  }, [selectedOptions, product, variantNodes]);

  const handleOptionSelect = useCallback((optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  }, []);

  const resetToDefaultOptions = useCallback(() => {
    setSelectedOptions(buildInitialSelectedOptions(product));
  }, [product]);

  return {
    selectedOptions,
    selectedVariant,
    handleOptionSelect,
    resetToDefaultOptions,
  };
}
