'use client';

/**
 * Filter Chips Component
 * 
 * Displays active filters as removable chips above the product grid
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { SubcategoryOption } from '@/lib/filters/category-filter';

interface FilterChipsProps {
  currentSubcategory?: SubcategoryOption;
  onClearAll: () => void;
}

interface FilterChip {
  key: string;
  label: string;
  value: string;
  param: string;
}

export function FilterChips({ currentSubcategory, onClearAll }: FilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeChips = useMemo(() => {
    const chips: FilterChip[] = [];

    // Subcategory chip
    if (currentSubcategory) {
      chips.push({
        key: 'subcategory',
        label: currentSubcategory.label,
        value: currentSubcategory.value,
        param: 'subcategory',
      });
    }

    // Size chips
    const sizes = searchParams.get('size');
    if (sizes) {
      sizes.split(',').forEach((size) => {
        chips.push({
          key: `size-${size}`,
          label: `Size: ${size}`,
          value: size,
          param: 'size',
        });
      });
    }

    // Color chips
    const colors = searchParams.get('color');
    if (colors) {
      colors.split(',').forEach((color) => {
        chips.push({
          key: `color-${color}`,
          label: `Color: ${color}`,
          value: color,
          param: 'color',
        });
      });
    }

    // Brand chips
    const brands = searchParams.get('brand');
    if (brands) {
      brands.split(',').forEach((brand) => {
        chips.push({
          key: `brand-${brand}`,
          label: `Brand: ${brand}`,
          value: brand,
          param: 'brand',
        });
      });
    }

    // Price range chip
    const price = searchParams.get('price');
    if (price) {
      const [min, max] = price.split('-');
      chips.push({
        key: 'price',
        label: `$${min} - $${max}`,
        value: price,
        param: 'price',
      });
    }

    // In stock chip
    const inStock = searchParams.get('inStock');
    if (inStock === 'true') {
      chips.push({
        key: 'inStock',
        label: 'In Stock Only',
        value: 'true',
        param: 'inStock',
      });
    }

    return chips;
  }, [searchParams, currentSubcategory]);

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
