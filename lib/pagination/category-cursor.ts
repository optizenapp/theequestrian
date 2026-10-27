/**
 * Category PLP cursor pagination.
 *
 * The cursor is our own: the product GID of the last product on the previous
 * page, looked up in the full filtered + sorted sequence. It is not a Shopify
 * Storefront cursor.
 */

export const CATEGORY_PAGE_SIZE = 36;

export type CategoryCursorStatus = 'none' | 'valid' | 'invalid';

export interface CategoryPagination {
  cursorStatus: CategoryCursorStatus;
  isFirstPage: boolean;
  startIndex: number;
  hasPreviousPage: boolean;
  /** Cursor for the preceding slice; null when the previous page is the clean URL. */
  previousCursor: string | null;
}

export interface CategoryPageSlice<T> {
  products: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  pagination: CategoryPagination;
}

export const FIRST_PAGE_PAGINATION: CategoryPagination = {
  cursorStatus: 'none',
  isFirstPage: true,
  startIndex: 0,
  hasPreviousPage: false,
  previousCursor: null,
};

export const INVALID_PAGE_PAGINATION: CategoryPagination = {
  cursorStatus: 'invalid',
  isFirstPage: false,
  startIndex: 0,
  hasPreviousPage: false,
  previousCursor: null,
};

/**
 * Slice `items` after the product whose id equals `after`.
 * A cursor is valid only if it exists in the sequence and yields a non-empty page.
 */
export function paginateById<T extends { id: string }>(
  items: T[],
  after: string | null,
  limit: number
): CategoryPageSlice<T> {
  let startIndex = 0;
  let pagination = FIRST_PAGE_PAGINATION;

  if (after) {
    const cursorIndex = items.findIndex((item) => item.id === after);
    if (cursorIndex === -1 || cursorIndex + 1 >= items.length) {
      return {
        products: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        pagination: INVALID_PAGE_PAGINATION,
      };
    }
    startIndex = cursorIndex + 1;
    const previousStart = Math.max(0, startIndex - limit);
    pagination = {
      cursorStatus: 'valid',
      isFirstPage: false,
      startIndex,
      hasPreviousPage: true,
      previousCursor: previousStart === 0 ? null : items[previousStart - 1].id,
    };
  }

  const products = items.slice(startIndex, startIndex + limit);
  const hasNextPage = startIndex + limit < items.length;
  return {
    products,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? products[products.length - 1].id : null,
    },
    pagination,
  };
}

/** Opt-in DB-first path (`db:N` offsets): validity is "the page has products". */
export function offsetPathPagination(after: string | null, hasProducts: boolean): CategoryPagination {
  if (!after) return FIRST_PAGE_PAGINATION;
  if (!hasProducts) return INVALID_PAGE_PAGINATION;
  return { ...FIRST_PAGE_PAGINATION, cursorStatus: 'valid', isFirstPage: false, hasPreviousPage: true };
}
