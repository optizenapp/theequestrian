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
import { ProductCard } from '@/components/ProductCard';
import { applyFilters } from '@/lib/filters/product-filters';
import { useLiveProductStatusOptimized } from '@/hooks/useLiveProductStatus';
import type { ReviewStats } from '@/lib/reviews/stats';
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
  allowedBrands?: { vendors: string[]; tags: string[] }; // Brand vendors and tags from brand-mapping.csv
  serverFacets?: {
    brands: { value: string; count: number; displayName: string }[];
    sizes: { value: string; count: number }[];
    colors: { value: string; count: number; originalValue: string }[];
    price: { min: number; max: number };
  };
  productUrls?: Map<string, string>; // Map of product.id -> canonical URL
  reviewStatsMap?: Map<string, ReviewStats>; // Map of product.handle -> review stats
}

export function ProductGridWithFilters({
  products,
  currentCategory,
  currentSubcategory,
  pageInfo,
  totalCount,
  allowedBrands,
  serverFacets,
  productUrls,
  reviewStatsMap,
}: ProductGridWithFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Hydrate products with real-time price and inventory data
  const { products: hydratedProducts, isLoading: isHydrating } = useLiveProductStatusOptimized(products);

  // Get filters from URL params
  const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParams]);
  
  // Get sort option from URL params
  const sortBy = searchParams.get('sort') || 'featured';
  
  // Sort options configuration
  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'on-sale', label: 'On Sale' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];
  
  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Featured';

  // Apply filters to products
  // Note: Brand, Size, and Color filters are handled SERVER-SIDE for proper pagination
  // Only price filtering is done client-side (on the current page)
  const filteredProducts = useMemo(() => {
    const clientFilters = { ...filters };
    // Remove server-side filters (brand, size, color) from client-side filtering
    delete clientFilters.brands;
    delete clientFilters.sizes;
    delete clientFilters.colors;
    return applyFilters(hydratedProducts, clientFilters);
  }, [hydratedProducts, filters]);
  
  // Apply sorting to filtered products
  const sortedProducts = useMemo(() => {
    const productsToSort = [...filteredProducts];
    
    switch (sortBy) {
      case 'price-asc':
        return productsToSort.sort((a, b) => {
          const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
          const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
          return priceA - priceB;
        });
      
      case 'price-desc':
        return productsToSort.sort((a, b) => {
          const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
          const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
          return priceB - priceA;
        });
      
      case 'newest':
        return productsToSort.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Newest first
        });
      
      case 'oldest':
        return productsToSort.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB; // Oldest first
        });
      
      case 'on-sale':
        return productsToSort.sort((a, b) => {
          const aOnSale = a.compareAtPriceRange?.minVariantPrice && 
            parseFloat(a.compareAtPriceRange.minVariantPrice.amount) > parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
          const bOnSale = b.compareAtPriceRange?.minVariantPrice && 
            parseFloat(b.compareAtPriceRange.minVariantPrice.amount) > parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
          
          if (aOnSale === bOnSale) return 0;
          return aOnSale ? -1 : 1; // On sale items first
        });
      
      case 'featured':
      default:
        return productsToSort; // Keep original order
    }
  }, [filteredProducts, sortBy]);

  // Extract filter options from products (prefer server facets if available)
  const sizeOptions = useMemo(() => {
    if (serverFacets?.sizes) {
      return serverFacets.sizes.map(f => ({ value: f.value, label: f.value, count: f.count }));
    }
    return getSizeOptions(hydratedProducts);
  }, [hydratedProducts, serverFacets]);

  const colorOptions = useMemo(() => {
    if (serverFacets?.colors) {
      return serverFacets.colors.map(f => ({ value: f.value, label: f.originalValue, count: f.count }));
    }
    return getColorOptions(hydratedProducts);
  }, [hydratedProducts, serverFacets]);

  const brandOptions = useMemo(() => {
    // If we have server facets (calculated from ALL products), use them
    if (serverFacets?.brands) {
      // Filter the server facets by allowed brands (from CSV)
      // and map to FilterOption format
      const options = serverFacets.brands
        .filter(facet => {
          if (!allowedBrands) return true;
          
          // Check if brand is in allowed vendors
          const isAllowedVendor = allowedBrands.vendors.some(v => v.toLowerCase() === facet.value.toLowerCase());
          
          // Check if brand matches an allowed tag
          const isAllowedTag = allowedBrands.tags.some(t => t.toLowerCase() === facet.value.toLowerCase());
          
          return isAllowedVendor || isAllowedTag;
        })
        .map(facet => ({
          value: facet.value, // normalized lowercase for filtering
          label: facet.displayName, // proper case for display
          count: facet.count
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
        
      return options;
    }
    
    // Fallback to extracting from current page products (client-side)
    return getBrandOptions(hydratedProducts, allowedBrands);
  }, [hydratedProducts, allowedBrands, serverFacets]);
  
  const priceRange = useMemo(() => {
    if (serverFacets?.price) {
      return serverFacets.price;
    }
    return getPriceRange(hydratedProducts);
  }, [hydratedProducts, serverFacets]);

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
  
  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === 'featured') {
      params.delete('sort');
    } else {
      params.set('sort', newSort);
    }
    // Reset to first page when sorting changes
    params.delete('cursor');
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname);
    setIsSortDropdownOpen(false);
  };

  const currentCursor = searchParams.get('cursor');
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#sort-dropdown')) {
        setIsSortDropdownOpen(false);
      }
    };
    
    if (isSortDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isSortDropdownOpen]);

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
          {/* Results count and Sort */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-gray-600">
                {totalCount !== undefined ? (
                  <>Showing {totalCount} {totalCount === 1 ? 'result' : 'results'}</>
                ) : (
                  <>
                    Showing {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'} on this page
                    {pageInfo?.hasNextPage && <span className="text-gray-500"> (more available)</span>}
                  </>
                )}
              </p>
              {isHydrating && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating prices...
                </span>
              )}
            </div>
            
            {/* Custom Sort Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Sort by:
              </span>
              <div id="sort-dropdown" className="relative">
                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center justify-between gap-3 bg-white pl-4 pr-3 py-2.5 text-sm font-medium text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all cursor-pointer min-w-[200px]"
                >
                  <span>{currentSortLabel}</span>
                  <svg 
                    className={`h-5 w-5 text-gray-400 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isSortDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-full min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-primary/5 text-primary font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {sortedProducts.length === 0 ? (
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
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    canonicalUrl={productUrls?.get(product.id)}
                    reviewStats={reviewStatsMap?.get(product.handle)}
                  />
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
