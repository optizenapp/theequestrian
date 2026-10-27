import { getCanonicalSiteUrl } from '@/lib/seo/site-url';
import { isDefaultCategoryView, type CategorySearchParams } from '@/lib/pagination/category-query';
import type { CategoryPagination } from '@/lib/pagination/category-cursor';

/** Clean category URL, or category URL + validated cursor for deeper pages. */
export function buildCategoryCanonicalUrl(pathname: string, cursor: string | null): string {
  const base = `${getCanonicalSiteUrl()}${pathname}`;
  if (!cursor) return base;
  return `${base}?${new URLSearchParams({ cursor }).toString()}`;
}

/**
 * Cursor to include in the canonical: only for a valid cursor on the unfiltered
 * default-sort sequence. Filtered / sorted views keep the clean-path canonical.
 */
export function selfCanonicalCursor(
  sp: CategorySearchParams,
  cursor: string | null,
  pagination: CategoryPagination
): string | null {
  if (!cursor || pagination.cursorStatus !== 'valid') return null;
  return isDefaultCategoryView(sp) ? cursor : null;
}
