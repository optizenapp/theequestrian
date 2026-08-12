import { permanentRedirect, redirect } from 'next/navigation';
import { getProductAllocationByHandle } from '@/lib/db/product-allocations';
import {
  deactivateProductDeleteRedirectsForHandle,
  getManualRedirect,
} from '@/lib/redirects/manual';

function normalizePath(path: string): string {
  const trimmed = (path || '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

/** Parent path = path with last segment removed. e.g. /horse/rugs/foo → /horse/rugs */
export function parentPathFromProductUrl(path: string): string {
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}

/**
 * Resolve where a missing/unavailable product URL should send users.
 * Category-based URLs drop the product handle; /products/{handle} uses allocation when present.
 * Falls back to home when no parent category is known.
 */
export async function resolveMissingProductRedirectTarget(
  productPath: string,
  handle?: string
): Promise<string> {
  const normalized = normalizePath(productPath);
  const segments = normalized.split('/').filter(Boolean);

  if (segments[0] === 'products' && segments.length === 2) {
    const productHandle = handle || segments[1];
    if (!productHandle) return '/';
    const allocation = await getProductAllocationByHandle(productHandle);
    if (allocation?.category_path) {
      return normalizePath(allocation.category_path);
    }
    if (allocation?.canonical_path) {
      return parentPathFromProductUrl(allocation.canonical_path);
    }
    return '/';
  }

  if (segments.length < 2) return '/';
  return parentPathFromProductUrl(normalized);
}

/** 301 to parent category for deleted / missing products. Falls back to home. */
export async function permanentRedirectMissingProduct(
  productPath: string,
  handle?: string
): Promise<never> {
  const target = await resolveMissingProductRedirectTarget(productPath, handle);
  permanentRedirect(target || '/');
}

/** Temporary redirect for unpublished / image-less products that may return later. */
export async function redirectMissingProduct(
  productPath: string,
  handle?: string
): Promise<never> {
  const target = await resolveMissingProductRedirectTarget(productPath, handle);
  redirect(target || '/');
}

/**
 * Follow a stored manual redirect, unless it was an auto product-delete redirect
 * and the product is available again (in which case the redirect is cleared).
 * Returns false when no redirect should be applied.
 */
export async function followManualRedirectUnlessProductRestored(options: {
  pathname: string;
  handle?: string;
  productAvailable: boolean;
  /** Live allocation/canonical PDP path. Never redirect away from this URL. */
  canonicalPath?: string;
}): Promise<boolean> {
  const manualRedirect = await getManualRedirect(options.pathname);
  if (!manualRedirect) return false;

  if (manualRedirect.source === 'product-delete' && options.productAvailable) {
    if (options.handle) {
      await deactivateProductDeleteRedirectsForHandle(options.handle);
    }
    return false;
  }

  if (options.productAvailable) {
    const requested = normalizePath(options.pathname);
    let canonical = options.canonicalPath ? normalizePath(options.canonicalPath) : null;
    if (!canonical && options.handle) {
      const allocation = await getProductAllocationByHandle(options.handle);
      if (allocation?.canonical_path) {
        canonical = normalizePath(allocation.canonical_path);
      }
    }
    if (canonical && requested === canonical) {
      return false;
    }
  }

  if (manualRedirect.type === '301' || manualRedirect.type === '308') {
    permanentRedirect(manualRedirect.to);
  }
  redirect(manualRedirect.to);
}
