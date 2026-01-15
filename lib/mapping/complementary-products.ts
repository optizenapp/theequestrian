/**
 * Complementary Product Type Mappings
 * Defines relationships between product categories for smart cross-selling
 * Used by cart recommendation system to suggest related products
 */

/**
 * Mapping of product types to their complementary product types
 * Key: Main product type
 * Value: Array of complementary product types that go well with it
 */
const COMPLEMENTARY_MAPPINGS: Record<string, string[]> = {
  // Horse Care & Equipment
  'Horse Rugs': ['Horse Boots', 'Horse Care', 'Horse Grooming', 'Horse Supplements'],
  'Horse Boots': ['Horse Rugs', 'Horse Care', 'Horse Bandages', 'Horse Leg Protection'],
  'Horse Care': ['Horse Rugs', 'Horse Boots', 'Horse Grooming', 'Horse Supplements'],
  'Horse Grooming': ['Horse Care', 'Horse Shampoo', 'Horse Brushes', 'Grooming Kits'],
  'Horse Supplements': ['Horse Care', 'Horse Feed', 'Horse Health'],
  'Horse Bandages': ['Horse Boots', 'Horse Leg Protection', 'Horse Care'],
  
  // Saddles & Tack
  'Saddles': ['Saddle Pads', 'Girths', 'Stirrups', 'Saddle Accessories', 'Leathers'],
  'Saddle Pads': ['Saddles', 'Girths', 'Saddle Accessories', 'Numnahs'],
  'Girths': ['Saddles', 'Saddle Pads', 'Girth Covers', 'Saddle Accessories'],
  'Stirrups': ['Saddles', 'Leathers', 'Stirrup Irons', 'Saddle Accessories'],
  'Leathers': ['Stirrups', 'Saddles', 'Stirrup Irons'],
  'Numnahs': ['Saddle Pads', 'Saddles', 'Girths'],
  
  // Bridles & Headwear
  'Bridles': ['Reins', 'Bits', 'Browbands', 'Nosebands', 'Headcollars'],
  'Reins': ['Bridles', 'Bits', 'Riding Gloves', 'Training Aids'],
  'Bits': ['Bridles', 'Reins', 'Bit Accessories'],
  'Browbands': ['Bridles', 'Headcollars', 'Bridle Accessories'],
  'Nosebands': ['Bridles', 'Headcollars'],
  'Headcollars': ['Lead Ropes', 'Bridles', 'Halters', 'Grooming'],
  'Lead Ropes': ['Headcollars', 'Halters', 'Stable Accessories'],
  
  // Rider Apparel
  'Riding Boots': ['Riding Apparel', 'Boot Care', 'Socks', 'Jodhpurs', 'Breeches'],
  'Riding Helmets': ['Riding Apparel', 'Helmet Accessories', 'Body Protectors'],
  'Riding Gloves': ['Riding Apparel', 'Reins', 'Whips', 'Jodhpurs'],
  'Jodhpurs': ['Riding Boots', 'Riding Gloves', 'Riding Apparel', 'Belts'],
  'Breeches': ['Riding Boots', 'Riding Gloves', 'Riding Apparel', 'Belts'],
  'Body Protectors': ['Riding Helmets', 'Riding Apparel', 'Safety Equipment'],
  'Riding Jackets': ['Riding Apparel', 'Riding Boots', 'Jodhpurs', 'Gloves'],
  'Riding Shirts': ['Riding Apparel', 'Jodhpurs', 'Breeches', 'Show Wear'],
  
  // Stable & Yard
  'Stable Rugs': ['Horse Rugs', 'Stable Accessories', 'Horse Care'],
  'Stable Accessories': ['Stable Rugs', 'Stable Equipment', 'Feed Buckets', 'Grooming'],
  'Feed Buckets': ['Stable Accessories', 'Horse Feed', 'Water Buckets'],
  'Water Buckets': ['Stable Accessories', 'Feed Buckets', 'Stable Equipment'],
  'Hay Nets': ['Stable Accessories', 'Horse Feed', 'Stable Equipment'],
  
  // Training & Exercise
  'Lunging Equipment': ['Training Aids', 'Whips', 'Lead Ropes', 'Horse Training'],
  'Training Aids': ['Lunging Equipment', 'Reins', 'Horse Training', 'Bits'],
  'Whips': ['Training Aids', 'Riding Gloves', 'Lunging Equipment'],
  'Horse Training': ['Training Aids', 'Lunging Equipment', 'Ground Work'],
  
  // Travel & Transport
  'Travel Boots': ['Horse Boots', 'Travel Rugs', 'Horse Transport', 'Bandages'],
  'Travel Rugs': ['Horse Rugs', 'Travel Boots', 'Horse Transport'],
  'Horse Transport': ['Travel Boots', 'Travel Rugs', 'Head Bumpers'],
  
  // Competition & Show
  'Show Wear': ['Riding Shirts', 'Riding Jackets', 'Show Accessories', 'Jodhpurs'],
  'Show Accessories': ['Show Wear', 'Grooming', 'Plaiting', 'Competition Wear'],
  'Competition Wear': ['Show Wear', 'Show Accessories', 'Riding Boots', 'Helmets'],
  'Plaiting': ['Grooming', 'Show Accessories', 'Horse Care'],
  
  // Dog Products (if applicable)
  'Dog Food': ['Dog Treats', 'Dog Bowls', 'Dog Accessories'],
  'Dog Treats': ['Dog Food', 'Dog Training', 'Dog Toys'],
  'Dog Toys': ['Dog Treats', 'Dog Accessories', 'Dog Training'],
  'Dog Coats': ['Dog Accessories', 'Dog Collars', 'Dog Leads'],
  'Dog Collars': ['Dog Leads', 'Dog Coats', 'Dog Accessories'],
  'Dog Leads': ['Dog Collars', 'Dog Harnesses', 'Dog Accessories'],
  
  // Pet Care General
  'Pet Care': ['Pet Grooming', 'Pet Accessories', 'Pet Health'],
  'Pet Grooming': ['Pet Care', 'Grooming Tools', 'Pet Shampoo'],
  'Pet Accessories': ['Pet Care', 'Pet Toys', 'Pet Bowls'],
};

/**
 * Get complementary product types for given product types
 * Returns unique list of complementary types that aren't in the input
 * 
 * @param productTypes - Array of product types currently in cart
 * @returns Array of complementary product types
 */
export function getComplementaryTypes(productTypes: string[]): string[] {
  const complementarySet = new Set<string>();
  
  for (const type of productTypes) {
    const complementary = COMPLEMENTARY_MAPPINGS[type];
    if (complementary) {
      complementary.forEach(compType => {
        // Don't include types that are already in cart
        if (!productTypes.includes(compType)) {
          complementarySet.add(compType);
        }
      });
    }
  }
  
  return Array.from(complementarySet);
}

/**
 * Check if two product types are complementary
 * 
 * @param type1 - First product type
 * @param type2 - Second product type
 * @returns true if types are complementary
 */
export function areTypesComplementary(type1: string, type2: string): boolean {
  const complementary = COMPLEMENTARY_MAPPINGS[type1];
  return complementary ? complementary.includes(type2) : false;
}

/**
 * Get all product types that have complementary mappings defined
 * Useful for debugging and validation
 * 
 * @returns Array of all product types with mappings
 */
export function getAllMappedTypes(): string[] {
  return Object.keys(COMPLEMENTARY_MAPPINGS);
}

/**
 * Get the raw complementary mappings object
 * Useful for debugging and testing
 * 
 * @returns The complete mapping object
 */
export function getComplementaryMappings(): Record<string, string[]> {
  return COMPLEMENTARY_MAPPINGS;
}
