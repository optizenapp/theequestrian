'use client';

/**
 * Product Grid With Filters Component
 * 
 * Client component that handles product filtering based on URL params
 * and displays filtered products
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { buildGa4ItemFromProduct, trackViewItemList } from '@/lib/analytics/ga4-ecommerce';
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
  productUrls?: Record<string, string>; // product.id -> canonical URL (plain object for RSC serialization)
  reviewStatsMap?: Record<string, ReviewStats>; // product.handle -> review stats (plain object for RSC serialization)
  /** Override GA4 `item_list_id` (defaults from category path) */
  itemListId?: string;
  itemListName?: string;
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
  itemListId: itemListIdProp,
  itemListName: itemListNameProp,
}: ProductGridWithFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Hydrate products with real-time price and inventory data
  const { products: hydratedProducts } = useLiveProductStatusOptimized(products, {
    // Category grids need dependable compare-at hydration for sale badges and "On Sale" sorting.
    // Use strict/no-store mode to avoid stale or missing compare-at values.
    deferMs: 250,
    mode: 'strict',
  });

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
  // IMPORTANT: Always keep in-stock products before out-of-stock products
  const sortedProducts = useMemo(() => {
    const productsToSort = [...filteredProducts];
    
    switch (sortBy) {
      case 'price-asc':
        return productsToSort.sort((a, b) => {
          // First: Sort by availability (in-stock first)
          if (a.availableForSale !== b.availableForSale) {
            return a.availableForSale ? -1 : 1;
          }
          // Second: Sort by price
          const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
          const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
          return priceA - priceB;
        });
      
      case 'price-desc':
        return productsToSort.sort((a, b) => {
          // First: Sort by availability (in-stock first)
          if (a.availableForSale !== b.availableForSale) {
            return a.availableForSale ? -1 : 1;
          }
          // Second: Sort by price
          const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
          const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
          return priceB - priceA;
        });
      
      case 'newest':
        return productsToSort.sort((a, b) => {
          // First: Sort by availability (in-stock first)
          if (a.availableForSale !== b.availableForSale) {
            return a.availableForSale ? -1 : 1;
          }
          // Second: Sort by date
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Newest first
        });
      
      case 'oldest':
        return productsToSort.sort((a, b) => {
          // First: Sort by availability (in-stock first)
          if (a.availableForSale !== b.availableForSale) {
            return a.availableForSale ? -1 : 1;
          }
          // Second: Sort by date
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB; // Oldest first
        });
      
      case 'on-sale':
        return productsToSort.sort((a, b) => {
          // First: Sort by sale status (actual discounts first)
          const aOnSale = a.compareAtPriceRange?.minVariantPrice && 
            parseFloat(a.compareAtPriceRange.minVariantPrice.amount) > parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
          const bOnSale = b.compareAtPriceRange?.minVariantPrice && 
            parseFloat(b.compareAtPriceRange.minVariantPrice.amount) > parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
          
          if (aOnSale !== bOnSale) return aOnSale ? -1 : 1;
          // Second: in-stock first inside each group
          if (a.availableForSale !== b.availableForSale) {
            return a.availableForSale ? -1 : 1;
          }
          return 0;
        });
      
      case 'featured':
      default:
        // For featured, still maintain in-stock first
        return productsToSort.sort((a, b) => {
          if (a.availableForSale !== b.availableForSale) {
            return a.availableForSale ? -1 : 1;
          }
          return 0; // Keep original order for same availability
        });
    }
  }, [filteredProducts, sortBy]);

  const listId =
    itemListIdProp ??
    `/${currentCategory}${currentSubcategory ? `/${currentSubcategory}` : ''}`;
  const listName = itemListNameProp ?? listId;

  const listSignature = useMemo(
    () => sortedProducts.map((p) => p.id).join('|'),
    [sortedProducts]
  );

  useEffect(() => {
    if (sortedProducts.length === 0) return;
    const currency =
      sortedProducts[0]?.priceRange?.minVariantPrice?.currencyCode || 'AUD';
    trackViewItemList({
      item_list_id: listId,
      item_list_name: listName,
      currency,
      items: sortedProducts.map((p, i) =>
        buildGa4ItemFromProduct(p, { index: i, listId, listName })
      ),
    });
    // listSignature proxies sortedProducts identity for stable analytics firing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listSignature, listId, listName]);

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
      if (!target.closest('#sort-dropdown') && !target.closest('#sort-dropdown-mobile')) {
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
        <section
          className="flex-1 min-w-0"
          aria-labelledby="collection-product-results-heading"
        >
          <h2 id="collection-product-results-heading" className="sr-only">
            Products
          </h2>
          {/* Mobile: Filter Button and Sort on same line */}
          <div className="lg:hidden mb-4 flex items-center justify-between gap-3">
            <FilterButton onClick={() => setIsMobileFilterOpen(true)} activeFilterCount={Object.keys(filters).length} />
            
            {/* Sort Dropdown - Mobile */}
            <div id="sort-dropdown-mobile" className="relative flex-1 max-w-[200px]">
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 bg-white pl-3 pr-2 py-2.5 text-sm font-medium text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all cursor-pointer"
              >
                <span className="truncate">{currentSortLabel}</span>
                <svg 
                  className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isSortDropdownOpen ? 'rotate-180' : ''}`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
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

          {/* Results count - Centered on mobile */}
          <div className="mb-6">
            <p className="text-gray-600 text-center lg:text-left">
              {totalCount !== undefined ? (
                <>Showing {totalCount} {totalCount === 1 ? 'result' : 'results'}</>
              ) : (
                <>
                  Showing {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'} on this page
                  {pageInfo?.hasNextPage && <span className="text-gray-500"> (more available)</span>}
                </>
              )}
            </p>
          </div>
          
          {/* Desktop: Sort Dropdown */}
          <div className="hidden lg:flex mb-6 items-center justify-end gap-3">
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
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0">
                {sortedProducts.map((product, index) => (
                  <li key={product.id} className="min-h-0">
                    <ProductCard
                      product={product}
                      priority={index < 6}
                      canonicalUrl={productUrls?.[product.id]}
                      reviewStats={reviewStatsMap?.[product.handle]}
                      itemListId={listId}
                      itemListName={listName}
                      itemIndex={index}
                    />
                  </li>
                ))}
              </ul>

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
        </section>
      </div>
    </div>
  );
}
