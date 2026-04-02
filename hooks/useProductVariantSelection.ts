'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ShopifyProduct, ShopifyVariant } from '@/types/shopify';

export function buildInitialSelectedOptions(product: ShopifyProduct): Record<string, string> {
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
}

export function useProductVariantSelection(product: ShopifyProduct) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    buildInitialSelectedOptions(product)
  );

  const selectedVariant = useMemo((): ShopifyVariant | undefined => {
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
