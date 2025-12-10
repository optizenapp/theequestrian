/**
 * Server-side helper to get allowed brand vendors from brand-mapping.csv
 */

import { getAllBrands } from '@/lib/mapping/brand-mapping';

/**
 * Get list of vendor names and tags that are in the brand-mapping.csv
 * This is used to filter the brand options to only show curated brands
 * Returns an object with both vendor names and tag names
 */
export function getAllowedBrandVendors(): { vendors: string[]; tags: string[] } {
  const brands = getAllBrands();
  
  console.log('[getAllowedBrandVendors] Loaded brands:', brands.length);
  
  // Extract vendor names and tags from the rules column
  const vendors: string[] = [];
  const tags: string[] = [];
  
  brands.forEach((brand) => {
    // Parse the rules to find vendor/tag conditions
    // Rules format: [{"column":"VENDOR"|"TAG","relation":"EQUALS","condition":"Brand Name"}]
    if (brand.rules && brand.rules !== 'Manual Collection') {
      try {
        const rules = JSON.parse(brand.rules);
        rules.forEach((rule: any) => {
          if (rule.column === 'VENDOR' && rule.condition) {
            vendors.push(rule.condition);
          } else if (rule.column === 'TAG' && rule.condition) {
            tags.push(rule.condition.toLowerCase()); // Tags are lowercase
          }
        });
      } catch (e) {
        console.warn('[getAllowedBrandVendors] Failed to parse rules for', brand.handle, e);
      }
    }
  });
  
  console.log('[getAllowedBrandVendors] Extracted vendors:', vendors.length, vendors.slice(0, 10));
  console.log('[getAllowedBrandVendors] Extracted tags:', tags.length, tags.slice(0, 10));
  
  return { vendors, tags };
}

