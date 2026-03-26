import { unstable_cache } from 'next/cache';
import { getHomeSections, type HomeSection } from '@/lib/content/home';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import type { ShopifyProductCard } from '@/types/shopify';

export type HomeSectionWithFetchedProducts = HomeSection & {
  fetchedProducts?: ShopifyProductCard[];
};

async function loadHomeSectionsWithProducts(): Promise<HomeSectionWithFetchedProducts[]> {
  const sections = await getHomeSections();
  return Promise.all(
    sections.map(async (section) => {
      if (section.product_handles && section.product_handles.length > 0) {
        const products = await getProductsByHandles(section.product_handles);
        return { ...section, fetchedProducts: products };
      }
      return section;
    })
  );
}

/** Cross-request cache (Vercel Data Cache) so `/` stays fast despite `force-dynamic`. */
export const getCachedHomeSectionsWithProducts = unstable_cache(
  loadHomeSectionsWithProducts,
  ['home-sections-with-products'],
  { revalidate: 300 }
);
