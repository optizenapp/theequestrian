'use client';

/**
 * Price Filter Component
 * 
 * Dual-handle range slider for price filtering
 * Fixed range: $0 - $500
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PriceFilterProps {
  min: number;
  max: number;
  currencyCode?: string;
}

export function PriceFilter({ min, max, currencyCode = 'USD' }: PriceFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(true);
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  // Initialize from URL
  useEffect(() => {
    const priceParam = searchParams.get('price');
    if (priceParam) {
      const [urlMin, urlMax] = priceParam.split('-').map(Number);
      if (!isNaN(urlMin) && !isNaN(urlMax)) {
        setLocalMin(urlMin);
        setLocalMax(urlMax);
      }
    } else {
      setLocalMin(min);
      setLocalMax(max);
    }
  }, [searchParams, min, max]);

  const applyPriceFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams);

    if (localMin === min && localMax === max) {
      params.delete('price');
    } else {
      params.set('price', `${localMin}-${localMax}`);
    }

    router.push(`?${params.toString()}`);
  }, [localMin, localMax, min, max, searchParams, router]);

  const handleReset = () => {
    setLocalMin(min);
    setLocalMax(max);
    const params = new URLSearchParams(searchParams);
    params.delete('price');
    router.push(`?${params.toString()}`);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="border-b border-neutral-200 pb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-4 group"
        aria-expanded={isExpanded}
      >
        <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
          Price
        </h3>
        <svg
          className={`w-5 h-5 text-neutral-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-4">
          {/* Price Display */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              {formatPrice(localMin)}
            </span>
            <span className="text-neutral-400">to</span>
            <span className="text-neutral-600">
              {formatPrice(localMax)}
            </span>
          </div>

          {/* Min Slider */}
          <div>
            <label htmlFor="price-min" className="sr-only">
              Minimum price
            </label>
            <input
              id="price-min"
              type="range"
              min={min}
              max={max}
              value={localMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalMin(Math.min(value, localMax - 10));
              }}
              onMouseUp={applyPriceFilter}
              onTouchEnd={applyPriceFilter}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Max Slider */}
          <div>
            <label htmlFor="price-max" className="sr-only">
              Maximum price
            </label>
            <input
              id="price-max"
              type="range"
              min={min}
              max={max}
              value={localMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalMax(Math.max(value, localMin + 10));
              }}
              onMouseUp={applyPriceFilter}
              onTouchEnd={applyPriceFilter}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Reset Button */}
          {(localMin !== min || localMax !== max) && (
            <button
              onClick={handleReset}
              className="text-sm text-primary hover:text-primary-dark underline"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
