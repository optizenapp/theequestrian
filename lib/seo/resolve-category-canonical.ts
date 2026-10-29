import { getProductsByCategoryForCollectionPage } from '@/lib/shopify/category-collection-fetch';
import { CATEGORY_PAGE_SIZE } from '@/lib/pagination/category-cursor';
import { parseCategoryQuery, type CategorySearchParams } from '@/lib/pagination/category-query';
import { buildCategoryCanonicalUrl, selfCanonicalCursor } from '@/lib/seo/category-canonical';

export interface CategoryPageSeo {
  canonicalUrl: string;
  /** 1 on the first page; null when the position can't be derived (opt-in offset path). */
  pageNumber: number | null;
  totalPages: number | null;
}

/**
 * Canonical + page position for `generateMetadata`. Uses the same cached fetch as the page,
 * so a cursor only becomes self-canonical once it has been validated against the sequence.
 */
export async function resolveCategoryPageSeo(pathname: string, sp: CategorySearchParams): Promise<CategoryPageSeo> {
  const query = parseCategoryQuery(sp);
  const firstPage: CategoryPageSeo = { canonicalUrl: buildCategoryCanonicalUrl(pathname, null), pageNumber: 1, totalPages: null };
  if (query.cursor.kind !== 'value') return firstPage;

  try {
    const { pagination, totalCount } = await getProductsByCategoryForCollectionPage(
      pathname,
      CATEGORY_PAGE_SIZE,
      query.cursor.cursor,
      query.filters,
      query.sortBy
    );
    const pageNumber =
      pagination.cursorStatus === 'valid' && pagination.startIndex > 0
        ? Math.floor(pagination.startIndex / CATEGORY_PAGE_SIZE) + 1
        : null;
    return {
      canonicalUrl: buildCategoryCanonicalUrl(pathname, selfCanonicalCursor(sp, query.cursor.cursor, pagination)),
      pageNumber,
      totalPages: totalCount > 0 ? Math.ceil(totalCount / CATEGORY_PAGE_SIZE) : null,
    };
  } catch (error) {
    console.error('[resolveCategoryPageSeo] Falling back to first-page SEO for', pathname, error);
    return firstPage;
  }
}
