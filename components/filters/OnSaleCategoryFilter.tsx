'use client';

/**
 * On-sale page facet: filter deals by top-level category.
 * Only options with at least one on-sale product are shown.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { FilterOption } from '@/lib/filters/product-filters';

interface OnSaleCategoryFilterProps {
  options: FilterOption[];
}

export function OnSaleCategoryFilter({ options }: OnSaleCategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get('saleCategory');

  const selectCategory = useCallback(
    (value: string) => {
      const params = new URLSearchParams(
        typeof window !== 'undefined'
          ? window.location.search
          : searchParams.toString()
      );

      if (selected === value) {
        params.delete('saleCategory');
      } else {
        params.set('saleCategory', value);
      }
      params.delete('cursor');

      const query = params.toString();
      router.push(query ? `?${query}` : '/on-sale', { scroll: false });
    },
    [router, searchParams, selected]
  );

  if (options.length === 0) return null;

  return (
    <div className="border-b border-gray-200 pb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Product On Sale Per Category
      </h3>
      <div className="space-y-2">
        {options.map((option) => {
          const isActive = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectCategory(option.value)}
              className={`flex w-full items-center justify-between text-left text-sm py-1 transition-colors ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              aria-pressed={isActive}
            >
              <span>{option.label}</span>
              {option.count > 0 && (
                <span className="text-xs text-gray-500">({option.count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
