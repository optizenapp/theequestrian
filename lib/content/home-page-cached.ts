import { unstable_cache } from 'next/cache';
import { HOME_DATA_CACHE_REVALIDATE_SECONDS } from '@/lib/config/route-revalidate';
import { getHomeSections, type HomeSection } from '@/lib/content/home';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { getProductCanonicalUrls } from '@/lib/shopify/products';
import type { ShopifyProductCard } from '@/types/shopify';

export type HomeCarouselProduct = ShopifyProductCard & { href: string };

export type HomeSectionWithFetchedProducts = HomeSection & {
  fetchedProducts?: HomeCarouselProduct[];
};

async function loadHomeSectionsWithProducts(): Promise<HomeSectionWithFetchedProducts[]> {
  const sections = await getHomeSections();
  return Promise.all(
    sections.map(async (section) => {
      if (section.product_handles && section.product_handles.length > 0) {
        const products = await getProductsByHandles(section.product_handles);
        const urlById = await getProductCanonicalUrls(products);
        const fetchedProducts: HomeCarouselProduct[] = products.map((product) => ({
          ...product,
          href: urlById.get(product.id) ?? `/products/${product.handle}`,
        }));
        return { ...section, fetchedProducts };
      }
      return section;
    })
  );
}

/** Cross-request cache (Vercel Data Cache) so `/` stays fast despite `force-dynamic`. */
export const getCachedHomeSectionsWithProducts = unstable_cache(
  loadHomeSectionsWithProducts,
  ['home-sections-with-products'],
  { revalidate: HOME_DATA_CACHE_REVALIDATE_SECONDS, tags: ['home-sections'] }
);
