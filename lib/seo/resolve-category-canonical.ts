import { getProductsByCategoryForCollectionPage } from '@/lib/shopify/category-collection-fetch';
import { CATEGORY_PAGE_SIZE } from '@/lib/pagination/category-cursor';
import { parseCategoryQuery, type CategorySearchParams } from '@/lib/pagination/category-query';
import { buildCategoryCanonicalUrl, selfCanonicalCursor } from '@/lib/seo/category-canonical';

/**
 * Canonical for `generateMetadata`. Uses the same cached fetch as the page, so a
 * cursor only becomes self-canonical once it has been validated against the sequence.
 */
export async function resolveCategoryCanonicalUrl(
  pathname: string,
  sp: CategorySearchParams
): Promise<string> {
  const query = parseCategoryQuery(sp);
  if (query.cursor.kind !== 'value') return buildCategoryCanonicalUrl(pathname, null);

  try {
    const { pagination } = await getProductsByCategoryForCollectionPage(
      pathname,
      CATEGORY_PAGE_SIZE,
      query.cursor.cursor,
      query.filters,
      query.sortBy
    );
    return buildCategoryCanonicalUrl(pathname, selfCanonicalCursor(sp, query.cursor.cursor, pagination));
  } catch (error) {
    console.error('[resolveCategoryCanonicalUrl] Falling back to clean canonical for', pathname, error);
    return buildCategoryCanonicalUrl(pathname, null);
  }
}
