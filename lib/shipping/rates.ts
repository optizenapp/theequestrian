/**
 * Vendor Shipping Rates Configuration
 * 
 * Maps vendors to their shipping costs.
 * Update this file when shipping rates change.
 */

export const VENDOR_SHIPPING_RATES: Record<string, number> = {
  'Ascot Saddlery': 12.00,
  'HORSE QUEENED': 15.00,
  'Tacklet': 15.00,
  'Shire Saddleworld': 15.00,
  'Paddock Blade': 0.00,
  'The Equestrian': 0.00,
  'JNK Collective': 12.00,
  'QJ Riding Wear': 8.00,
  'Runaway Equestrian Co.': 18.00,
  'Plum Tack': 8.00,
  'JP Equestrian Fashion': 8.00,
  'Ippico Equestrian': 8.00,
  'Top Brands': 8.00,
  'Little Equine Co': 8.00,
  'Helmet Brims': 18.00,
  'Diamond Deluxe Horsewear': 15.00,
  'Hitchley & Harrow': 8.00,
  'Living Horse Tails Jewellery By Monika': 8.00,
  'EAC Animal Care': 8.00,
  'Dapple Eq': 8.00,
  'Thinline Global Australia': 8.00,
  'Trailrace ': 0.00,
  // CAN Animal Care uses weight-based rates (see WEIGHT_BASED_VENDORS below)
};

/**
 * Tag-based shipping overrides
 * Higher priority than vendor rates
 * Tags must match EXACTLY as they appear in Shopify (case-sensitive)
 */
export const TAG_SHIPPING_OVERRIDES: Record<string, number> = {
  '#HEAVY': 15.00,    // Ascot Saddlery heavy items
  'ponyjet': 15.00,   // The Equestrian ponyjet items
};

/**
 * Default shipping cost if vendor not found
 */
export const DEFAULT_SHIPPING_COST = 8.00;

/**
 * Weight-based shipping configuration
 * For vendors that calculate shipping based on product weight
 */
export const WEIGHT_BASED_VENDORS: Record<string, Array<{ maxWeight: number; cost: number }>> = {
  'CAN Animal Care': [
    { maxWeight: 5, cost: 15.00 },      // 0-5kg = $15
    { maxWeight: 10, cost: 20.00 },     // 5.01-10kg = $20
    { maxWeight: 20, cost: 25.00 },     // 10.01-20kg = $25
    { maxWeight: Infinity, cost: 25.00 }, // 20kg+ = $25
  ],
};

/**
 * Get shipping cost for a product
 * Checks weight-based rules first, then tags, then vendor rate, then default
 * 
 * @param vendor - Vendor name (must match Shopify exactly)
 * @param tags - Product tags
 * @param weightInKg - Product weight in kilograms (optional)
 */
export function getShippingCost(vendor: string, tags: string[] = [], weightInKg?: number): number {
  // Normalize inputs
  const vendorLower = vendor.toLowerCase().trim();
  const tagsLower = tags.map(t => t.toLowerCase().trim());
  
  // 1. Check weight-based vendors first (highest priority for weight-based vendors)
  const weightRules = Object.entries(WEIGHT_BASED_VENDORS).find(
    ([vendorName]) => vendorName.toLowerCase() === vendorLower
  )?.[1];
  
  if (weightRules && weightInKg !== undefined) {
    for (const rule of weightRules) {
      if (weightInKg <= rule.maxWeight) {
        console.log(`[Shipping] ${vendor}: ${weightInKg}kg → $${rule.cost} (weight-based)`);
        return rule.cost;
      }
    }
  }
  
  // 2. Check tag overrides (high priority)
  // Tags must match EXACTLY (case-sensitive)
  for (const [tag, cost] of Object.entries(TAG_SHIPPING_OVERRIDES)) {
    if (tags.includes(tag)) {
      return cost;
    }
  }
  
  // 3. Check vendor rate
  for (const [vendorName, cost] of Object.entries(VENDOR_SHIPPING_RATES)) {
    if (vendorName.toLowerCase() === vendorLower) {
      return cost;
    }
  }
  
  // 4. Return default if vendor not found
  console.warn(`No shipping rate found for vendor: ${vendor}, using default: $${DEFAULT_SHIPPING_COST}`);
  return DEFAULT_SHIPPING_COST;
}

/**
 * Calculate total shipping for multiple products
 */
export function calculateTotalShipping(
  items: Array<{ vendor: string; tags?: string[]; quantity: number; weightInKg?: number }>
): number {
  return items.reduce((total, item) => {
    const shippingCost = getShippingCost(item.vendor, item.tags || [], item.weightInKg);
    return total + (shippingCost * item.quantity);
  }, 0);
}
