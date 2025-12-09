'use client';

/**
 * Product Grid With Filters Component
 * 
 * Client component that handles product filtering based on URL params
 * and displays filtered products
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { applyFilters } from '@/lib/filters/product-filters';
import {
  getSizeOptions,
  getColorOptions,
  getBrandOptions,
  getPriceRange,
} from '@/lib/filters/product-filters';
import {
  getFilterPreferences,
  saveFilterPreferences,
  clearFilterPreferences,
  getFiltersFromSearchParams,
} from '@/lib/filters/localStorage';
import { FilterChips } from './FilterChips';
import { FilterButton } from './FilterButton';
import { FilterSidebar } from './FilterSidebar';
import type { ShopifyProduct } from '@/types/shopify';
import type { FilterOption } from '@/lib/filters/product-filters';

import type { FilterPreferences } from '@/lib/filters/localStorage';

interface ProductGridWithFiltersProps {
  products: ShopifyProduct[];
  currentCategory: string;
  currentSubcategory?: string;
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  totalCount?: number;
}

export function ProductGridWithFilters({
  products,
  currentCategory,
  currentSubcategory,
  pageInfo,
  totalCount,
}: ProductGridWithFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Get filters from URL params
  const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParams]);

  // Apply filters to products
  // Note: Client-side filtering is applied to the CURRENT page of products fetched from server
  // Ideally, filtering should also move to server-side for full efficiency
  const filteredProducts = useMemo(() => applyFilters(products, filters), [products, filters]);

  // Extract filter options from products
  const sizeOptions = useMemo(() => getSizeOptions(products), [products]);
  const colorOptions = useMemo(() => getColorOptions(products), [products]);
  const brandOptions = useMemo(() => getBrandOptions(products), [products]);
  const priceRange = useMemo(() => getPriceRange(products), [products]);

  // Save filter preferences to localStorage
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      saveFilterPreferences(filters);
    }
  }, [filters]);

  const handleNextPage = () => {
    if (pageInfo?.endCursor) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('cursor', pageInfo.endCursor);
      router.push(`?${params.toString()}`);
    }
  };

  const handlePreviousPage = () => {
    // Remove cursor to go back to first page
    // In a more sophisticated implementation, you'd track cursor history
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cursor');
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname);
  };

  const currentCursor = searchParams.get('cursor');

  return (
    <div>
      {/* Filter Chips - Show active filters */}
      <FilterChips
        filters={filters}
        onClearAll={() => {
          clearFilterPreferences();
          window.location.href = `/${currentCategory}${currentSubcategory ? `/${currentSubcategory}` : ''}`;
        }}
      />

      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <FilterButton onClick={() => setIsMobileFilterOpen(true)} activeFilterCount={Object.keys(filters).length} />
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          {/* Total Products Count */}
          {totalCount !== undefined && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Total Products: <span className="text-lg font-bold">{totalCount}</span>
              </p>
            </div>
          )}
          
          <FilterSidebar
            currentCategory={currentCategory}
            sizeOptions={sizeOptions}
            colorOptions={colorOptions}
            brandOptions={brandOptions}
            priceRange={priceRange}
            isOpen={false}
            onClose={() => {}}
          />
        </aside>

        {/* Mobile Filter Sidebar */}
        {isMobileFilterOpen && (
          <div className="lg:hidden">
            <FilterSidebar
              currentCategory={currentCategory}
              sizeOptions={sizeOptions}
              colorOptions={colorOptions}
              brandOptions={brandOptions}
              priceRange={priceRange}
              isOpen={isMobileFilterOpen}
              onClose={() => setIsMobileFilterOpen(false)}
            />
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1">
          {/* Results count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} on this page
              {pageInfo?.hasNextPage && <span className="text-gray-500"> (more available)</span>}
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters</p>
              <button
                onClick={() => {
                  clearFilterPreferences();
                  window.location.href = `/${currentCategory}${currentSubcategory ? `/${currentSubcategory}` : ''}`;
                }}
                className="text-primary hover:text-primary-dark underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.handle}`}
                    className="group border rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    {/* Product Image */}
                    {product.images.edges.length > 0 && (
                      <div className="aspect-square overflow-hidden rounded-md mb-4 bg-gray-100">
                        <img
                          src={product.images.edges[0].node.url}
                          alt={product.images.edges[0].node.altText || product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    {/* Product Info */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {product.title}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {product.priceRange.minVariantPrice.currencyCode}{' '}
                        {parseFloat(product.priceRange.minVariantPrice.amount).toFixed(2)}
                      </span>
                      {(product as any).compareAtPriceRange && 
                       parseFloat((product as any).compareAtPriceRange.minVariantPrice.amount) > 
                       parseFloat(product.priceRange.minVariantPrice.amount) && (
                        <span className="text-sm text-gray-500 line-through">
                          {(product as any).compareAtPriceRange.minVariantPrice.currencyCode}{' '}
                          {parseFloat((product as any).compareAtPriceRange.minVariantPrice.amount).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Availability */}
                    {!product.availableForSale && (
                      <span className="text-sm text-red-600 mt-2 block">Out of Stock</span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Pagination Controls */}
              {(currentCursor || pageInfo?.hasNextPage) && (
                <div className="mt-8 flex justify-center gap-4">
                  {currentCursor && (
                    <button
                      onClick={handlePreviousPage}
                      className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                    >
                      &larr; Previous Page
                    </button>
                  )}
                  {pageInfo?.hasNextPage && (
                    <button
                      onClick={handleNextPage}
                      className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Next Page &rarr;
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
