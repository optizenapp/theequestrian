'use client';

/**
 * Filter Sidebar Component
 * 
 * Main container for all filters
 * Responsive: sidebar on desktop, bottom drawer on mobile
 */

import { useState, useEffect } from 'react';
import { CategoryFilter } from './CategoryFilter';
import { PriceFilter } from './PriceFilter';
import { AttributeFilter } from './AttributeFilter';
import type { SubcategoryOption } from '@/lib/filters/category-filter';
import type { FilterOption } from '@/lib/filters/product-filters';

interface FilterSidebarProps {
  // Category filter props
  subcategories: SubcategoryOption[];
  currentCategory: string;
  currentSubcategory?: string;
  parentCollectionTitle: string;

  // Attribute filter options
  sizeOptions: FilterOption[];
  colorOptions: FilterOption[];
  brandOptions: FilterOption[];

  // Price range
  priceMin?: number;
  priceMax?: number;
  currencyCode?: string;

  // Mobile drawer state
  isOpen?: boolean;
  onClose?: () => void;
}

export function FilterSidebar({
  subcategories,
  currentCategory,
  currentSubcategory,
  parentCollectionTitle,
  sizeOptions,
  colorOptions,
  brandOptions,
  priceMin,
  priceMax,
  currencyCode = 'USD',
  isOpen = false,
  onClose,
}: FilterSidebarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  const content = (
    <div className="space-y-6">
      {/* Category Filter */}
      {subcategories.length > 0 && (
        <CategoryFilter
          subcategories={subcategories}
          currentCategory={currentCategory}
          currentSubcategory={currentSubcategory}
          parentCollectionTitle={parentCollectionTitle}
        />
      )}

      {/* Price Filter */}
      <PriceFilter
        min={priceMin || 0}
        max={priceMax || 500}
        currencyCode={currencyCode}
      />

      {/* Size Filter */}
      {sizeOptions.length > 0 && (
        <AttributeFilter
          title="Size"
          options={sizeOptions}
          paramName="size"
        />
      )}

      {/* Color Filter */}
      {colorOptions.length > 0 && (
        <AttributeFilter
          title="Color"
          options={colorOptions}
          paramName="color"
        />
      )}

      {/* Brand Filter */}
      {brandOptions.length > 0 && (
        <AttributeFilter
          title="Brand"
          options={brandOptions}
          paramName="brand"
        />
      )}
    </div>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white z-50 transition-transform duration-300 ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-neutral-500 hover:text-neutral-700"
              aria-label="Close filters"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 73px)' }}>
            {content}
          </div>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-4">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Filters</h2>
        {content}
      </div>
    </aside>
  );
}
