import { notFound, permanentRedirect } from 'next/navigation';
import {
  parseCursorParam,
  pathWithoutCursor,
  type CategorySearchParams,
} from '@/lib/pagination/category-query';
import type { CategoryPagination } from '@/lib/pagination/category-cursor';

/**
 * Validate the raw `cursor` param before fetching.
 * Empty → redirect to the same URL without it; repeated or malformed → 404.
 */
export function requireCategoryCursor(pathname: string, sp: CategorySearchParams): string | null {
  const parsed = parseCursorParam(sp.cursor);
  if (parsed.kind === 'empty') permanentRedirect(pathWithoutCursor(pathname, sp));
  if (parsed.kind === 'malformed') notFound();
  return parsed.kind === 'value' ? parsed.cursor : null;
}

/** Unknown, stale or out-of-range cursor on a real category → 404 (never a silent page 1). */
export function requireValidCategoryPage(pagination: CategoryPagination): void {
  if (pagination.cursorStatus === 'invalid') notFound();
}
