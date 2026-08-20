/**
 * localStorage utilities for filter persistence
 * Stores filter preferences per collection
 */

export interface FilterPreferences {
  subcategory?: string | string[];
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  priceRange?: { min: number; max: number };
  inStockOnly?: boolean;
  /** /on-sale only: filter by top-level category (horse, rider, …) */
  saleCategory?: string;
  
  // Alias for compatibility
  size?: string[];
  color?: string[];
  brand?: string[];
  price?: { min: number; max: number };
  inStock?: boolean;
}

const STORAGE_PREFIX = 'collection-filters-';

/**
 * Get filter preferences for a collection
 */
export function getFilterPreferences(
  collectionHandle: string
): FilterPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(
      `${STORAGE_PREFIX}${collectionHandle}`
    );
    if (!stored) return null;

    return JSON.parse(stored) as FilterPreferences;
  } catch (error) {
    console.error('Error reading filter preferences:', error);
    return null;
  }
}

/**
 * Save filter preferences for a collection
 */
export function saveFilterPreferences(
  preferences: FilterPreferences
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}current`,
      JSON.stringify(preferences)
    );
  } catch (error) {
    console.error('Error saving filter preferences:', error);
  }
}

/**
 * Clear filter preferences for a collection
 */
export function clearFilterPreferences(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}current`);
  } catch (error) {
    console.error('Error clearing filter preferences:', error);
  }
}

/**
 * Get filter preferences from URL search params
 */
export function getFiltersFromSearchParams(
  searchParams: URLSearchParams
): FilterPreferences {
  const filters: FilterPreferences = {};

  // Size
  const sizes = searchParams.get('size');
  if (sizes) {
    filters.sizes = sizes.split(',');
  }

  // Color
  const colors = searchParams.get('color');
  if (colors) {
    filters.colors = colors.split(',');
  }

  // Brand
  const brands = searchParams.get('brand');
  if (brands) {
    filters.brands = brands.split(',');
  }

  // Price range
  const price = searchParams.get('price');
  if (price) {
    const [min, max] = price.split('-').map(Number);
    if (!isNaN(min) && !isNaN(max)) {
      filters.priceRange = { min, max };
    }
  }

  // In stock only
  const inStock = searchParams.get('inStock');
  if (inStock === 'true') {
    filters.inStockOnly = true;
  }

  // On-sale top-level category
  const saleCategory = searchParams.get('saleCategory');
  if (saleCategory) {
    filters.saleCategory = saleCategory;
  }

  return filters;
}

/**
 * Convert filter preferences to URL search params
 */
export function filtersToSearchParams(
  filters: FilterPreferences
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.sizes && filters.sizes.length > 0) {
    params.set('size', filters.sizes.join(','));
  }

  if (filters.colors && filters.colors.length > 0) {
    params.set('color', filters.colors.join(','));
  }

  if (filters.brands && filters.brands.length > 0) {
    params.set('brand', filters.brands.join(','));
  }

  if (filters.priceRange) {
    params.set(
      'price',
      `${filters.priceRange.min}-${filters.priceRange.max}`
    );
  }

  if (filters.inStockOnly) {
    params.set('inStock', 'true');
  }

  if (filters.saleCategory) {
    params.set('saleCategory', filters.saleCategory);
  }

  return params;
}
