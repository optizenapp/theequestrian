/**
 * URL-safe handle from a display brand name (for brand_content.handle).
 */
export function slugFromBrandName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'brand';
}
