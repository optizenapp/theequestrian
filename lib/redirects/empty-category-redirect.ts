/**
 * Empty category redirect: when a category has no products, redirect to parent.
 *
 * Uses existing:
 * - getCollectionContent(urlPath) – optional, for parent_url when path is in collection_content
 * - getProductsByCategory(categoryPath) – product count by path (DB allocations)
 *
 * Redirect when:
 * - Path has 0 products (getProductsByCategory returns totalCount 0).
 * - Target = content.parent_url if path is in collection_content, else path with last segment dropped.
 *
 * So even if the path is not in collection_content (e.g. /pet/dog/accessories/dog-bandanas),
 * we still redirect to parent when there are no products allocated to that path.
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

  let redirectTarget: string;
  const content = await getCollectionContent(normalized);
  if (content?.status === 'published' && content.parent_url?.trim()) {
    redirectTarget = normalizePath(content.parent_url.trim());
  } else {
    redirectTarget = parentPath(normalized);
  }

  if (redirectTarget === normalized) return null;

  try {
    const { totalCount } = await getProductsByCategory(normalized, 1, null, undefined);
    if (totalCount > 0) return null;
  } catch {
    return null;
  }

  return redirectTarget;
}
