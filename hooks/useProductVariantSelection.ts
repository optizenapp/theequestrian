'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ShopifyProduct, ShopifyVariant } from '@/types/shopify';

function byPriceAsc(a: ShopifyVariant, b: ShopifyVariant): number {
  return parseFloat(a.price.amount) - parseFloat(b.price.amount);
}

function isOnSale(v: ShopifyVariant): boolean {
  return (
    v.compareAtPrice != null &&
    parseFloat(v.compareAtPrice.amount) > parseFloat(v.price.amount)
  );
}

function findBestDefaultVariant(product: ShopifyProduct): ShopifyVariant | undefined {
  const variants = product.variants.edges.map((e) => e.node);
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

export function buildInitialSelectedOptions(product: ShopifyProduct): Record<string, string> {
  const variantToSelect = findBestDefaultVariant(product);
  if (!variantToSelect) return {};
  const initialOptions: Record<string, string> = {};
  variantToSelect.selectedOptions.forEach((option) => {
    initialOptions[option.name] = option.value;
  });
  return initialOptions;
}

export function useProductVariantSelection(product: ShopifyProduct) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    buildInitialSelectedOptions(product)
  );

  const selectedVariant = useMemo((): ShopifyVariant | undefined => {
    if (Object.keys(selectedOptions).length === 0) {
      return findBestDefaultVariant(product);
    }
    return product.variants.edges.find(({ node: variant }) =>
      variant.selectedOptions.every((option) => selectedOptions[option.name] === option.value)
    )?.node;
  }, [selectedOptions, product.variants.edges]);

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
