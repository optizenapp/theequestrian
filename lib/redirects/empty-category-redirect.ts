/**
 * Empty category redirect: unpublished/unknown paths with 0 products roll up to parent.
 * Published collection_content leaves are never redirected here (including draft-only grids).
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
 * If the given path has 0 products, returns the parent path to redirect to.
 * Otherwise returns null (no redirect).
 *
 * Does not require the path to exist in collection_content; any deep path with
 * no products (e.g. /pet/dog/accessories/dog-bandanas) will redirect to parent.
 */
export async function getEmptyCategoryRedirectTarget(path: string): Promise<string | null> {
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const content = await getCollectionContent(normalized);
  // Published leaves stay (including newly allocated Shopify drafts that Storefront
  // does not count as live yet). Unknown/unpublished empty paths still roll up.
  if (content) return null;

  const redirectTarget = parentPath(normalized);
  if (redirectTarget === normalized) return null;

  try {
    const { totalCount } = await getProductsByCategory(normalized, 1, null, undefined);
    if (totalCount > 0) return null;
  } catch {
    return null;
  }

  return redirectTarget;
}
