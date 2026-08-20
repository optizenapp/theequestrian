'use client';

/**
 * Filter Chips Component
 * 
 * Displays active filters as removable chips above the product grid
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { SubcategoryOption } from '@/lib/filters/category-filter';
import type { FilterPreferences } from '@/lib/filters/localStorage';
import { ON_SALE_TOP_CATEGORIES } from '@/lib/filters/on-sale-category';

interface FilterChipsProps {
  filters: FilterPreferences;
  onClearAll: () => void;
}

interface FilterChip {
  key: string;
  label: string;
  value: string;
  param: string;
}

export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeChips = useMemo(() => {
    const chips: FilterChip[] = [];

    // Subcategory chip
    if (filters.subcategory) {
      chips.push({
        key: 'subcategory',
        label: Array.isArray(filters.subcategory) ? filters.subcategory[0] : filters.subcategory,
        value: Array.isArray(filters.subcategory) ? filters.subcategory[0] : filters.subcategory,
        param: 'subcategory',
      });
    }

    // Size chips
    if (filters.sizes) {
      filters.sizes.forEach((size) => {
        chips.push({
          key: `size-${size}`,
          label: `Size: ${size}`,
          value: size,
          param: 'size',
        });
      });
    } else if (filters.size) { // Alias fallback
      filters.size.forEach((size) => {
        chips.push({
          key: `size-${size}`,
          label: `Size: ${size}`,
          value: size,
          param: 'size',
        });
      });
    }

    // Color chips
    if (filters.colors) {
      filters.colors.forEach((color) => {
        chips.push({
          key: `color-${color}`,
          label: `Color: ${color}`,
          value: color,
          param: 'color',
        });
      });
    } else if (filters.color) { // Alias fallback
      filters.color.forEach((color) => {
        chips.push({
          key: `color-${color}`,
          label: `Color: ${color}`,
          value: color,
          param: 'color',
        });
      });
    }

    // Brand chips
    if (filters.brands) {
      filters.brands.forEach((brand) => {
        chips.push({
          key: `brand-${brand}`,
          label: `Brand: ${brand}`,
          value: brand,
          param: 'brand',
        });
      });
    } else if (filters.brand) { // Alias fallback
      filters.brand.forEach((brand) => {
        chips.push({
          key: `brand-${brand}`,
          label: `Brand: ${brand}`,
          value: brand,
          param: 'brand',
        });
      });
    }

    // Price range chip
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      if (min !== undefined && max !== undefined) {
        chips.push({
          key: 'price',
          label: `$${min} - $${max}`,
          value: `${min}-${max}`,
          param: 'price',
        });
      }
    } else if (filters.price) { // Alias fallback
      const { min, max } = filters.price;
      if (min !== undefined && max !== undefined) {
        chips.push({
          key: 'price',
          label: `$${min} - $${max}`,
          value: `${min}-${max}`,
          param: 'price',
        });
      }
    }

    // In stock chip
    if (filters.inStockOnly) {
      chips.push({
        key: 'inStock',
        label: 'In Stock Only',
        value: 'true',
        param: 'inStock',
      });
    } else if (filters.inStock) { // Alias fallback
      chips.push({
        key: 'inStock',
        label: 'In Stock Only',
        value: 'true',
        param: 'inStock',
      });
    }

    // On-sale top-level category chip
    if (filters.saleCategory) {
      const known = ON_SALE_TOP_CATEGORIES.find(
        (c) => c.handle === filters.saleCategory
      );
      const label = known?.label
        ?? filters.saleCategory.charAt(0).toUpperCase() + filters.saleCategory.slice(1);
      chips.push({
        key: 'saleCategory',
        label: `Category: ${label}`,
        value: filters.saleCategory,
        param: 'saleCategory',
      });
    }

    return chips;
  }, [filters]);

  const removeChip = (chip: FilterChip) => {
    const params = new URLSearchParams(searchParams);

    if (chip.param === 'subcategory') {
      params.delete('subcategory');
    } else if (['size', 'color', 'brand'].includes(chip.param)) {
      const current = params.get(chip.param);
      if (current) {
        const values = current.split(',').filter((v) => v !== chip.value);
        if (values.length > 0) {
          params.set(chip.param, values.join(','));
        } else {
          params.delete(chip.param);
        }
      }
    } else {
      params.delete(chip.param);
    }

    router.push(`?${params.toString()}`);
  };

  if (activeChips.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <span className="text-sm text-neutral-600">Active filters:</span>
      {activeChips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => removeChip(chip)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors"
        >
          <span>{chip.label}</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ))}
      {activeChips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-neutral-600 hover:text-neutral-900 underline ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
