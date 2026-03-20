/**
 * Server-side helper to get allowed brand vendors from brand_content (DB).
 */

import { getAllowedBrandVendorsFromDb } from '@/lib/content/brand-content';

/**
 * Get list of vendor names and tags that are in the brand_content table (published brands).
 * This is used to filter the brand options to only show curated brands on category pages.
 * Returns an object with both vendor names and tag names.
 */
export async function getAllowedBrandVendors(): Promise<{
  vendors: string[];
  tags: string[];
}> {
  const { vendors, tags } = await getAllowedBrandVendorsFromDb();
  return { vendors, tags };
}
