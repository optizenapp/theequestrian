/**
 * Product Filter Utilities
 * 
 * Extracts filter options (size, color, brand, etc.) from products
 * and provides filtering logic
 */

import type { ShopifyProduct, ShopifyVariant } from '@/types/shopify';
import { normalizeColor, isColorValue } from '@/lib/utils/product-options';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface FilterPreferences {
  subcategory?: string | string[];
  size?: string[];
  color?: string[];
  brand?: string[];
  price?: { min: number; max: number };
  inStock?: boolean;
}

/**
 * Extract unique sizes from products
 */
export function getSizeOptions(products: ShopifyProduct[]): FilterOption[] {
  const sizeMap = new Map<string, number>();

  products.forEach((product) => {
    product.variants.edges.forEach(({ node: variant }) => {
      const sizeOption = variant.selectedOptions.find(
        (opt) => opt.name.toLowerCase() === 'size'
      );
      if (sizeOption) {
        // Skip if it looks like a color (e.g. "Black", "Navy")
        // This prevents colors from appearing in the Size filter
        if (!isColorValue(sizeOption.value)) {
          const count = sizeMap.get(sizeOption.value) || 0;
          sizeMap.set(sizeOption.value, count + 1);
        }
      }
    });
  });

  return Array.from(sizeMap.entries())
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }))
    .sort((a, b) => {
      // Try to sort numerically if possible
      const aNum = parseFloat(a.value);
      const bNum = parseFloat(b.value);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.value.localeCompare(b.value);
    });
}

/**
 * Extract unique colors from products
 */
export function getColorOptions(products: ShopifyProduct[]): FilterOption[] {
  const colorMap = new Map<string, { count: number; originalValue: string }>();

  products.forEach((product) => {
    product.variants.edges.forEach(({ node: variant }) => {
      const colorOption = variant.selectedOptions.find(
        (opt) => {
          const name = opt.name.toLowerCase();
          return name === 'color' || name === 'colour'; // Support both US and UK spelling
        }
      );
      if (colorOption) {
        const normalizedValue = normalizeColor(colorOption.value);
        const existing = colorMap.get(normalizedValue);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(normalizedValue, {
            count: 1,
            originalValue: colorOption.value,
          });
        }
      }
    });
  });

  return Array.from(colorMap.entries())
    .map(([value, { count, originalValue }]) => ({
      value: value.toLowerCase(),
      label: originalValue, // Keep original casing for display
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Extract unique brands from products based on brand-mapping.csv
 * This ensures we ONLY show brands that exist in brand-mapping.csv
 * 
 * IMPORTANT: allowedBrands parameter is REQUIRED and must be passed from the server
 * to ensure only curated brands from brand-mapping.csv appear in the filter.
 * 
 * Smart Exclusion: Automatically excludes any size/color values that exist as tags
 * by extracting them from variant.selectedOptions first.
 */
export function getBrandOptions(
  products: ShopifyProduct[],
  allowedBrands?: { vendors: string[]; tags: string[] }
): FilterOption[] {
  const brandMap = new Map<string, number>();

  // If no allowedBrands provided, return empty array (strict enforcement)
  if (!allowedBrands || (!allowedBrands.vendors.length && !allowedBrands.tags.length)) {
    console.warn('[getBrandOptions] No allowedBrands provided - returning empty brand filter');
    return [];
  }

  console.log('[getBrandOptions] Filtering with', allowedBrands.vendors.length, 'vendors and', allowedBrands.tags.length, 'tags');

  // STEP 1: Extract all size and color values from variant options
  // These should NEVER appear as brands, even if they exist in tags
  const sizeColorExclusions = new Set<string>();
  
  products.forEach((product) => {
    product.variants.edges.forEach(({ node: variant }) => {
      variant.selectedOptions.forEach((option) => {
        const optionName = option.name.toLowerCase();
        // Exclude size and color values (and any other variant option types)
        if (optionName === 'size' || optionName === 'color' || optionName === 'colour') {
          sizeColorExclusions.add(option.value.toLowerCase());
        }
      });
    });
  });

  console.log('[getBrandOptions] Excluding', sizeColorExclusions.size, 'size/color values:', 
    Array.from(sizeColorExclusions).slice(0, 10));

  // STEP 2: Create normalized lookup sets for fast matching
  const allowedVendorsSet = new Set(allowedBrands.vendors.map(v => v.toLowerCase()));
  const allowedTagsSet = new Set(allowedBrands.tags.map(t => t.toLowerCase()));

  // STEP 3: Extract brands from products
  products.forEach((product) => {
    let brandName: string | null = null;
    
    // Check if product matches by vendor (ONLY if in brand-mapping.csv)
    if (product.vendor && product.vendor.trim()) {
      const vendor = product.vendor.trim();
      const normalizedVendor = vendor.toLowerCase();
      
      if (allowedVendorsSet.has(normalizedVendor)) {
        brandName = vendor;
      }
    }
    
    // Check if product matches by tag (ONLY if in brand-mapping.csv AND not a size/color)
    if (!brandName) {
      const matchingTag = product.tags.find(tag => {
        const normalizedTag = tag.toLowerCase();
        
        // Exclude if it's a size or color value
        if (sizeColorExclusions.has(normalizedTag)) {
          return false;
        }
        
        // Only include if in brand-mapping.csv
        return allowedTagsSet.has(normalizedTag);
      });
      
      if (matchingTag) {
        // Find the original brand title from brand-mapping.csv for proper display
        // For now, capitalize the tag
        brandName = matchingTag.charAt(0).toUpperCase() + matchingTag.slice(1);
      }
    }
    
    if (brandName) {
      const count = brandMap.get(brandName) || 0;
      brandMap.set(brandName, count + 1);
    }
  });

  const options = Array.from(brandMap.entries())
    .map(([value, count]) => ({
      value: value,
      label: value,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  console.log('[getBrandOptions] Final brand options:', options.length, options.slice(0, 5));
  
  return options;
}

/**
 * Get price range from products
 */
export function getPriceRange(products: ShopifyProduct[]): PriceRange {
  if (products.length === 0) {
    return { min: 0, max: 500 };
  }

  let min = Infinity;
  let max = 0;

  products.forEach((product) => {
    const productMin = parseFloat(product.priceRange.minVariantPrice.amount);
    const productMax = parseFloat(product.priceRange.maxVariantPrice.amount);

    if (productMin < min) min = productMin;
    if (productMax > max) max = productMax;
  });

  // Round to nearest 10
  min = Math.floor(min / 10) * 10;
  max = Math.ceil(max / 10) * 10;

  // Ensure max is at least 500 for slider
  max = Math.max(max, 500);

  return { min: Math.max(0, min), max };
}

/**
 * Filter products by size
 */
export function filterBySize(
  products: ShopifyProduct[],
  sizes: string[]
): ShopifyProduct[] {
  if (sizes.length === 0) return products;

  return products.filter((product) => {
    return product.variants.edges.some(({ node: variant }) => {
      const sizeOption = variant.selectedOptions.find(
        (opt) => opt.name.toLowerCase() === 'size'
      );
      return sizeOption && sizes.includes(sizeOption.value);
    });
  });
}

/**
 * Filter products by color
 */
export function filterByColor(
  products: ShopifyProduct[],
  colors: string[]
): ShopifyProduct[] {
  if (colors.length === 0) return products;

  return products.filter((product) => {
    return product.variants.edges.some(({ node: variant }) => {
      const colorOption = variant.selectedOptions.find(
        (opt) => opt.name.toLowerCase() === 'color'
      );
      // Use normalized value for comparison
      return (
        colorOption && colors.includes(normalizeColor(colorOption.value))
      );
    });
  });
}

/**
 * Filter products by brand (using vendor field OR tags)
 */
export function filterByBrand(
  products: ShopifyProduct[],
  brands: string[]
): ShopifyProduct[] {
  if (brands.length === 0) return products;

  return products.filter((product) => {
    const canonical = product.brand?.trim();
    if (canonical && brands.some((b) => b.toLowerCase() === canonical.toLowerCase())) {
      return true;
    }
    if (product.vendor && brands.some((b) => b.toLowerCase() === product.vendor.toLowerCase())) {
      return true;
    }

    // Check tags (if the brand name matches a tag)
    // Note: Brand options from tags are usually capitalized, but tags in product are lowercase
    return product.tags.some(tag => 
      brands.some(brand => brand.toLowerCase() === tag.toLowerCase())
    );
  });
}

/**
 * Filter products by price range
 */
export function filterByPrice(
  products: ShopifyProduct[],
  minPrice: number,
  maxPrice: number
): ShopifyProduct[] {
  return products.filter((product) => {
    const productMin = parseFloat(product.priceRange.minVariantPrice.amount);
    const productMax = parseFloat(product.priceRange.maxVariantPrice.amount);

    // Product matches if any variant price falls within range
    return (
      (productMin >= minPrice && productMin <= maxPrice) ||
      (productMax >= minPrice && productMax <= maxPrice) ||
      (productMin <= minPrice && productMax >= maxPrice)
    );
  });
}

/**
 * Filter products by availability
 */
export function filterByAvailability(
  products: ShopifyProduct[],
  inStockOnly: boolean
): ShopifyProduct[] {
  if (!inStockOnly) return products;

  return products.filter((product) => product.availableForSale);
}

/**
 * Apply all filters to products
 */
export function applyFilters(
  products: ShopifyProduct[],
  filters: {
    sizes?: string[];
    colors?: string[];
    brands?: string[];
    priceRange?: { min: number; max: number };
    inStockOnly?: boolean;
  }
): ShopifyProduct[] {
  let filtered = [...products];

  if (filters.sizes && filters.sizes.length > 0) {
    filtered = filterBySize(filtered, filters.sizes);
  }

  if (filters.colors && filters.colors.length > 0) {
    filtered = filterByColor(filtered, filters.colors);
  }

  if (filters.brands && filters.brands.length > 0) {
    filtered = filterByBrand(filtered, filters.brands);
  }

  if (filters.priceRange) {
    filtered = filterByPrice(
      filtered,
      filters.priceRange.min,
      filters.priceRange.max
    );
  }

  if (filters.inStockOnly) {
    filtered = filterByAvailability(filtered, true);
  }

  return filtered;
}
