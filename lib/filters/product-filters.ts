/**
 * Product Filter Utilities
 * 
 * Extracts filter options (size, color, brand, etc.) from products
 * and provides filtering logic
 */

import type { ShopifyProduct, ShopifyVariant } from '@/types/shopify';

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
        const count = sizeMap.get(sizeOption.value) || 0;
        sizeMap.set(sizeOption.value, count + 1);
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
        (opt) => opt.name.toLowerCase() === 'color'
      );
      if (colorOption) {
        const normalizedValue = colorOption.value.toLowerCase();
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
 * This ensures we only show curated brands that have products in the current view
 * 
 * Note: This function runs client-side, so we can't directly import the CSV.
 * Instead, we need to pass the allowed brands from the server.
 * For now, we'll extract all vendors and let the server filter them.
 */
// Vendors to exclude from brand filters (store name, not customer-facing brands)
const EXCLUDED_VENDORS = new Set([
  'ascot saddlery',
  'the equestrian',
]);

// Tags to exclude from brand filters (colors, sizes, product types, etc.)
const NON_BRAND_TAGS = new Set([
  // Colors
  'black', 'white', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'gray',
  'navy', 'beige', 'tan', 'cream', 'silver', 'gold', 'bronze',
  // Sizes
  'small', 'medium', 'large', 'xl', 'xxl', 'xs', 'one size',
  // Product types/categories
  'birds', 'dog treats', 'cat food', 'dog flea treatment', 'all wormer', 'shampoo', 'litter',
  'air & freeze dried', 'rogz harness', 'zeez dog coats',
  // Generic tags
  'australia only', 'new', 'sale', 'clearance', 'featured', 'best seller',
  // Store name
  'ascot saddlery', 'ascotheavy', '#heavy',
]);

export function getBrandOptions(
  products: ShopifyProduct[],
  allowedBrands?: { vendors: string[]; tags: string[] }
): FilterOption[] {
  const brandMap = new Map<string, number>();

  console.log('[getBrandOptions] allowedBrands:', allowedBrands);

  products.forEach((product) => {
    let brandName: string | null = null;
    
    // Check if product matches by vendor
    if (product.vendor && product.vendor.trim()) {
      const vendor = product.vendor.trim();
      const normalizedVendor = vendor.toLowerCase();
      
      // Skip excluded vendors (store name, etc.)
      if (EXCLUDED_VENDORS.has(normalizedVendor)) {
        return;
      }
      
      // Case-insensitive check for vendor
      if (!allowedBrands || allowedBrands.vendors.some(v => v.toLowerCase() === normalizedVendor)) {
        brandName = vendor;
      }
    }
    
    // Check if product matches by tag (if not already matched by vendor)
    if (!brandName) {
      const matchingTag = product.tags.find(tag => {
        const normalizedTag = tag.toLowerCase();
        
        // Skip non-brand tags
        if (NON_BRAND_TAGS.has(normalizedTag)) {
          return false;
        }
        
        // If allowedBrands is specified, check against it
        if (allowedBrands?.tags) {
          return allowedBrands.tags.includes(normalizedTag);
        }
        
        // If no allowedBrands, include all non-excluded tags
        return true;
      });
      
      if (matchingTag) {
        // Use a capitalized version of the tag as the brand name
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
  
  console.log('[getBrandOptions] Final options:', options.length, options.slice(0, 5));
  
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
      return (
        colorOption && colors.includes(colorOption.value.toLowerCase())
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
    // Check vendor (case-insensitive)
    if (product.vendor && brands.some(b => b.toLowerCase() === product.vendor.toLowerCase())) {
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
