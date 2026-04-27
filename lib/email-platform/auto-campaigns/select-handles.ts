import type { BrandContentRow } from '@/lib/content/brand-content';
import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { getBrandProductsFromDb } from '@/lib/brands/get-brand-products';
import { getCollectionWithPagination } from '@/lib/shopify/collections';
import { getSalePageByPath } from '@/lib/mapping/sale-mapping';
import { selectProductsForAutoWeekly } from '@/lib/email-platform/auto-weekly/product-selection';
import type { AutoCampaignType } from './types';

export async function selectProductHandlesForAutoType(
  type: AutoCampaignType,
  options: { brandHandle: string | null; collectionHandle: string | null; scheduledAt: Date }
): Promise<string[]> {
  if (type === 'brand' && options.brandHandle) {
    const brand = await getBrandContentByHandle(options.brandHandle);
    if (!brand) return [];
    const { products } = await getBrandProductsFromDb(brand as BrandContentRow, 12, null, {});
    const handles = products.map((p) => p.handle).filter(Boolean);
    return [...new Set(handles)].slice(0, 3);
  }

  if (type === 'on_sale') {
    const pageData = getSalePageByPath('/on-sale');
    const collectionHandle = pageData?.handle || 'on-sale';
    const { products } = await getCollectionWithPagination(collectionHandle, 24);
    return products
      .filter((p) => p.handle)
      .slice(0, 3)
      .map((p) => p.handle);
  }

  if (type === 'category' && options.collectionHandle) {
    try {
      const { products } = await getCollectionWithPagination(options.collectionHandle, 24);
      return products
        .filter((p) => p.handle)
        .slice(0, 3)
        .map((p) => p.handle);
    } catch (error) {
      console.warn(
        `[auto-campaigns] Skipping invalid category collection handle "${options.collectionHandle}"`,
        error
      );
      return [];
    }
  }

  return (await selectProductsForAutoWeekly(options.scheduledAt, null)).slice(0, 3);
}
