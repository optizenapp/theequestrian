'use client';

/**
 * Attribute Filter Component (Size, Color, Brand, etc.)
 * 
 * Displays filter options as checkboxes with counts
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import type { FilterOption } from '@/lib/filters/product-filters';

interface AttributeFilterProps {
  title: string;
  options: FilterOption[];
  paramName: 'size' | 'color' | 'brand';
  maxVisible?: number;
}

export function AttributeFilter({
  title,
  options,
  paramName,
  maxVisible = 10,
}: AttributeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAll, setShowAll] = useState(false);

  // Get selected values from URL
  const selectedValues = useMemo(() => {
    const param = searchParams.get(paramName);
    return param ? param.split(',') : [];
  }, [searchParams, paramName]);

  const toggleValue = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentValues = selectedValues;

      let newValues: string[];
      if (currentValues.includes(value)) {
        // Remove value
        newValues = currentValues.filter((v) => v !== value);
      } else {
        // Add value
        newValues = [...currentValues, value];
      }

      if (newValues.length > 0) {
        params.set(paramName, newValues.join(','));
      } else {
        params.delete(paramName);
      }

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, paramName, selectedValues]
  );

  const displayOptions = showAll ? options : options.slice(0, maxVisible);

  if (options.length === 0) return null;

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <h3 className="font-semibold text-lg mb-3">{title}</h3>

      <div className="space-y-2">
        {displayOptions.map((option, index) => {
          const isChecked = selectedValues.includes(option.value);

          return (
            <label
              key={`${option.value}-${index}`}
              className="flex items-center justify-between cursor-pointer group hover:bg-gray-50 rounded-md px-2 py-1.5 -mx-2"
            >
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleValue(option.value)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                ({option.count})
              </span>
            </label>
          );
        })}

        {/* Show More / Show Less */}
        {options.length > maxVisible && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-left px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors -mx-2"
          >
            {showAll
              ? `Show less (${options.length - maxVisible} hidden)`
              : `Show ${options.length - maxVisible} more`}
          </button>
        )}
      </div>
    </div>
  );
}
