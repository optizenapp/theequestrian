import { NextResponse } from 'next/server';
import {
  getAllPublishedBrandContent,
  getBrandIndexDisplayName,
} from '@/lib/content/brand-content';
import { resolveBrandLogoUrl } from '@/lib/brands/resolve-brand-logo';

export const revalidate = 3600;

/**
 * Featured brands for the header mega menu.
 * GET /api/navigation/brands
 */
export async function GET() {
  try {
    const brands = await getAllPublishedBrandContent();
    const withProducts = brands.filter((b) => (b.products_count ?? 0) > 0);
    const sorted = [...withProducts].sort((a, b) => {
      const countDiff = (b.products_count ?? 0) - (a.products_count ?? 0);
      if (countDiff !== 0) return countDiff;
      return getBrandIndexDisplayName(a).localeCompare(getBrandIndexDisplayName(b), undefined, {
        sensitivity: 'base',
      });
    });

    const featured = sorted.slice(0, 12).map((brand) => ({
      handle: brand.handle,
      title: getBrandIndexDisplayName(brand),
      href: `/brands/${brand.handle}`,
      logoUrl: resolveBrandLogoUrl(brand),
      productsCount: brand.products_count ?? 0,
    }));

    return NextResponse.json({
      featured,
      totalCount: sorted.length,
    });
  } catch (error) {
    console.error('[api/navigation/brands]', error);
    return NextResponse.json({ error: 'Failed to load brands' }, { status: 500 });
  }
}
