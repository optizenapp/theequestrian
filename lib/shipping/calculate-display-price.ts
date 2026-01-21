/**
 * Calculate Display Price with Shipping
 * 
 * Adds shipping cost to base price for frontend display
 * This ensures customers see the final price upfront (no surprises at checkout)
 */

import { getShippingCost } from './rates';

export interface ProductPriceData {
  amount: string;
  currencyCode: string;
}

export interface ProductForPricing {
  vendor?: string;
  tags?: string[];
  weight?: {
    value: number; // Weight in grams (Shopify format)
    unit: string;
  };
}

/**
 * Calculate display price with shipping included
 * 
 * @param basePrice - Base price from Shopify
 * @param product - Product data (vendor, tags, weight)
 * @returns Price with shipping included
 */
export function calculateDisplayPrice(
  basePrice: ProductPriceData,
  product: ProductForPricing
): ProductPriceData {
  const basePriceAmount = parseFloat(basePrice.amount);
  
  // Get vendor (fallback to empty string if not provided)
  const vendor = product.vendor || '';
  
  // Get tags (fallback to empty array)
  const tags = product.tags || [];
  
  // Get weight in kg (convert from grams if available)
  const weightInKg = product.weight?.value ? product.weight.value / 1000 : undefined;
  
  // Calculate shipping cost
  const shippingCost = getShippingCost(vendor, tags, weightInKg);
  
  // Add shipping to base price
  const totalPrice = basePriceAmount + shippingCost;
  
  return {
    amount: totalPrice.toFixed(2),
    currencyCode: basePrice.currencyCode,
  };
}

/**
 * Calculate display price for a price range (min/max)
 * Used for products with variants that have different prices
 */
export function calculateDisplayPriceRange(
  minPrice: ProductPriceData,
  maxPrice: ProductPriceData,
  product: ProductForPricing
): {
  minVariantPrice: ProductPriceData;
  maxVariantPrice: ProductPriceData;
} {
  return {
    minVariantPrice: calculateDisplayPrice(minPrice, product),
    maxVariantPrice: calculateDisplayPrice(maxPrice, product),
  };
}

/**
 * Get shipping cost for display purposes
 * (Useful for showing "Includes $X shipping" message)
 */
export function getShippingCostForDisplay(product: ProductForPricing): number {
  const vendor = product.vendor || '';
  const tags = product.tags || [];
  const weightInKg = product.weight?.value ? product.weight.value / 1000 : undefined;
  
  return getShippingCost(vendor, tags, weightInKg);
}
