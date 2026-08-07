import { isMarketplaceAggregatorVendor } from '@/lib/brands/marketplace-vendors';

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Strip or rewrite "Brand:" bullets that incorrectly use a marketplace vendor
 * (Trailrace, Exclusively Equine, etc.) instead of the sellable brand.
 */
export function sanitizeBulletBrandLines(
  bullets: string[],
  options?: { canonicalBrand?: string | null; vendor?: string | null }
): string[] {
  const canonical = options?.canonicalBrand?.trim() || '';
  const canonicalIsReal = Boolean(canonical && !isMarketplaceAggregatorVendor(canonical));
  const vendorKey = options?.vendor ? normalizeKey(options.vendor) : '';

  return bullets.flatMap((raw) => {
    const bullet = raw.trim();
    if (!bullet) return [];

    const match = bullet.match(/^Brand:\s*(.+)$/i);
    if (!match) return [bullet];

    const value = match[1].trim();
    if (!value) return [];

    const valueIsMarketplace = isMarketplaceAggregatorVendor(value);
    const valueIsVendor =
      Boolean(vendorKey) && normalizeKey(value) === vendorKey && isMarketplaceAggregatorVendor(value);

    if (valueIsMarketplace || valueIsVendor) {
      if (canonicalIsReal) return [`Brand: ${canonical}`];
      return [];
    }

    return [bullet];
  });
}
