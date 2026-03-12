/**
 * Empty category redirect: when a category has no products, redirect to parent.
 *
 * Uses existing:
 * - getCollectionContent(urlPath) – category exists in collection_content
 * - getProductsByCategory(categoryPath) – product count by path (DB allocations)
 *
 * Redirect only when:
 * - Path is a known category (has collection_content row)
 * - Category has 0 products (no filters, no cursor)
 * - Redirect target is parent (content.parent_url or path with last segment dropped)
 */

import { getCollectionContent } from '@/lib/content/collections';
import { getProductsByCategory } from '@/lib/shopify/products';

function normalizePath(path: string): string {
  const trimmed = (path || '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

/** Parent path = path with last segment removed. e.g. /pet/dog/accessories/dog-bandanas -> /pet/dog/accessories */
function parentPath(path: string): string {
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return '/' + segments.slice(0, -1).join('/');
}

/**
 * If the given path is a known category with 0 products, returns the parent path to redirect to.
 * Otherwise returns null (no redirect).
 *
 * Used by:
 * - Catch-all route for 4+ segment URLs when last segment is not a product
 * - (Existing empty redirects in [category], [subcategory], [subcategory]/[product] stay as-is)
 */
export async function getEmptyCategoryRedirectTarget(path: string): Promise<string | null> {
  const normalized = normalizePath(path);
  const content = await getCollectionContent(normalized);
  if (!content || content.status !== 'published') {
    return null;
  }

  try {
    const { totalCount } = await getProductsByCategory(normalized, 1, null, undefined);
    if (totalCount > 0) {
      return null;
    }
  } catch {
    return null;
  }

  const target = content.parent_url && content.parent_url.trim() ? content.parent_url.trim() : parentPath(normalized);
  const targetNormalized = normalizePath(target);
  if (targetNormalized === normalized) {
    return null;
  }
  return targetNormalized;
}
