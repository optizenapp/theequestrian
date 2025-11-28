/**
 * Collection Mapping: Product Types → Core Collections
 * 
 * Maps Shopify product types to core collection handles for URL structure.
 * This determines which collection a product belongs to based on its productType.
 */

/**
 * Map product types to core collection handles
 * 
 * Format: "Product Type" → "collection-handle"
 * 
 * Example:
 * - "Breeches" → "womens-clothing"
 * - "Horse Boots" → "horse-boots"
 */
export const PRODUCT_TYPE_TO_COLLECTION: Record<string, string> = {
  // Women's Clothing
  'Clothing - Ladies Clothing': 'womens-clothing',
  'Breeches': 'womens-clothing',
  'Womens': 'womens-clothing',
  'Ladies Jacket': 'womens-clothing',
  'Ladies Competition Jacket': 'womens-clothing',
  'Ladies Shirt': 'womens-clothing',
  'Riding Tights': 'womens-clothing',
  'tights': 'womens-clothing',
  
  // Men's Clothing
  'Mens Competition Jacket': 'mens-clothing',
  'Mens': 'mens-clothing',
  
  // Horse Boots
  'Horse Boots': 'horse-boots',
  'HORSE: Horse Boots': 'horse-boots',
  'Tendon Boots': 'horse-boots',
  'Bell boots': 'horse-boots',
  'Overreach Boots': 'horse-boots',
  'Fetlock boots': 'horse-boots',
  
  // Horse Rugs
  'Rugs': 'horse-rugs',
  'Cotton Rugs': 'horse-rugs',
  'Rain Rugs': 'horse-rugs',
  
  // Saddles & Tack
  'Bits': 'saddles-tack',
  'HORSE: Bits': 'saddles-tack',
  'Saddle Cloths': 'saddles-tack',
  'HORSE: Saddlecloths': 'saddles-tack',
  'Saddle Pads & Blankets': 'saddles-tack',
  'Stirrup Leathers': 'saddles-tack',
  
  // Horse Health
  'STABLE: Supplements': 'horse-health',
  'Veterinary': 'horse-health',
  'STABLE: First Aid & Dressings': 'horse-health',
  
  // Stable & Grooming
  'STABLE: Grooming': 'stable-gear',
  'STABLE: Show Preparation': 'stable-gear',
  
  // Dog Products
  'Dog Collars & Leads': 'dog-products',
  'Dog Toys': 'dog-products',
  'Dog Treats': 'dog-products',
  'Dog Grooming & Coat Care': 'dog-products',
  'Dog Accessories': 'dog-products',
  'Dog Supplements': 'dog-products',
  
  // Cat Products
  'Cat Gyms & Toys': 'cat-products',
  
  // Jewellery
  'Jewellery': 'jewellery',
  'Rings': 'jewellery',
  'Charm Bead': 'jewellery',
  'Locket': 'jewellery',
  
  // Helmets & Safety
  'Helmets': 'rider-safety',
  
  // Giftware
  'RIDER: Giftware': 'giftware',
  'Gifts': 'giftware',
};

// Fallback: if no mapping exists, use a default collection
export const DEFAULT_COLLECTION = 'all-products';

export function getCollectionForProductType(productType: string): string {
  return PRODUCT_TYPE_TO_COLLECTION[productType] || DEFAULT_COLLECTION;
}

export function normalizeProductType(productType: string): string {
  // Convert to URL-friendly format
  return productType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}
