/**
 * Parse category PLP search params. Shared by pages and `generateMetadata`
 * so both hit the same cached fetch key.
 */

export type CategorySortBy = 'featured' | 'on-sale' | 'newest' | 'oldest' | 'price-asc' | 'price-desc';

export type CategorySearchParams = { [key: string]: string | string[] | undefined };

export type CursorParam =
  | { kind: 'none' }
  | { kind: 'empty' }
  | { kind: 'malformed' }
  | { kind: 'value'; cursor: string };

export interface CategoryQuery {
  cursor: CursorParam;
  filters: { brands?: string[]; sizes?: string[]; colors?: string[] };
  sortBy?: CategorySortBy;
}

/** Shopify product GID (default path) or `db:N` / `page:N` (opt-in DB-first path). */
const CURSOR_PATTERN = /^(gid:\/\/shopify\/Product\/\d+|db:\d+|page:\d+)$/;

/** Params that change the product sequence. Anything else (tracking etc.) is ignored. */
const FACET_KEYS = ['brand', 'size', 'color', 'price', 'inStock', 'saleCategory'] as const;

export function parseCursorParam(value: string | string[] | undefined): CursorParam {
  if (value === undefined) return { kind: 'none' };
  if (Array.isArray(value)) return { kind: 'malformed' };
  if (value === '') return { kind: 'empty' };
  return CURSOR_PATTERN.test(value) ? { kind: 'value', cursor: value } : { kind: 'malformed' };
}

function toList(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : value.split(',');
}

export function parseCategoryQuery(sp: CategorySearchParams): CategoryQuery {
  const { cursor, brand, size, color, sort } = sp;
  return {
    cursor: parseCursorParam(cursor),
    filters: { brands: toList(brand), sizes: toList(size), colors: toList(color) },
    sortBy: typeof sort === 'string' ? (sort as CategorySortBy) : undefined,
  };
}

/** True when the request is the unfiltered, default-sort product sequence. */
export function isDefaultCategoryView(sp: CategorySearchParams): boolean {
  if (FACET_KEYS.some((key) => sp[key] !== undefined)) return false;
  const { sort } = sp;
  return sort === undefined || sort === 'featured';
}

/** Same URL minus the cursor param, preserving everything else. */
export function pathWithoutCursor(pathname: string, sp: CategorySearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === 'cursor' || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
