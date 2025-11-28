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
 * Extract unique brands from products (using tags)
 * Assumes brand tags follow a pattern like "brand:ariat" or just "ariat"
 */
export function getBrandOptions(products: ShopifyProduct[]): FilterOption[] {
  const brandMap = new Map<string, number>();

  products.forEach((product) => {
    product.tags.forEach((tag) => {
      // Check if tag is a brand (you may need to adjust this logic)
      const brandTag = tag.toLowerCase();
      // Skip common non-brand tags
      if (
        !brandTag.includes('collection:') &&
        !brandTag.includes('type:') &&
        brandTag.length > 2
      ) {
        // For now, we'll use a simple heuristic
        // You may want to use a metafield or specific tag pattern
        const count = brandMap.get(brandTag) || 0;
        brandMap.set(brandTag, count + 1);
      }
    });
  });

  return Array.from(brandMap.entries())
    .map(([value, count]) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 20); // Limit to top 20 brands
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
 * Filter products by brand
 */
export function filterByBrand(
  products: ShopifyProduct[],
  brands: string[]
): ShopifyProduct[] {
  if (brands.length === 0) return products;

  return products.filter((product) => {
    return product.tags.some((tag) =>
      brands.includes(tag.toLowerCase())
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
 * Extract unique brands from products (using tags)
 * Assumes brand tags follow a pattern like "brand:ariat" or just "ariat"
 */
export function getBrandOptions(products: ShopifyProduct[]): FilterOption[] {
  const brandMap = new Map<string, number>();

  products.forEach((product) => {
    product.tags.forEach((tag) => {
      // Check if tag is a brand (you may need to adjust this logic)
      const brandTag = tag.toLowerCase();
      // Skip common non-brand tags
      if (
        !brandTag.includes('collection:') &&
        !brandTag.includes('type:') &&
        brandTag.length > 2
      ) {
        // For now, we'll use a simple heuristic
        // You may want to use a metafield or specific tag pattern
        const count = brandMap.get(brandTag) || 0;
        brandMap.set(brandTag, count + 1);
      }
    });
  });

  return Array.from(brandMap.entries())
    .map(([value, count]) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 20); // Limit to top 20 brands
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
 * Filter products by brand
 */
export function filterByBrand(
  products: ShopifyProduct[],
  brands: string[]
): ShopifyProduct[] {
  if (brands.length === 0) return products;

  return products.filter((product) => {
    return product.tags.some((tag) =>
      brands.includes(tag.toLowerCase())
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

