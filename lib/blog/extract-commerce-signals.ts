import { collectionRedirects } from '@/lib/redirects/maps';

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const raw = pathname.split('?')[0].split('#')[0];
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function isInternalHref(href: string): boolean {
  return (
    href.startsWith('/') ||
    href.includes('theequestrian.com.au') ||
    href.includes('theequestrian.com') ||
    href.includes('.myshopify.com')
  );
}

export function extractCommerceSignalsFromHtml(contentHtml: string): {
  productHandles: string[];
  ctaPathHint: string | null;
} {
  if (!contentHtml) return { productHandles: [], ctaPathHint: null };

  const hrefRegex = /href=["']([^"']+)["']/gi;
  const productHandles: string[] = [];
  const collectionPaths: string[] = [];
  const canonicalPaths: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = hrefRegex.exec(contentHtml))) {
    const href = (m[1] || '').trim();
    if (!href || !isInternalHref(href)) continue;

    let path = href;
    if (href.startsWith('http')) {
      try {
        path = new URL(href).pathname;
      } catch {
        continue;
      }
    }
    const pathname = normalizePathname(path);

    const productMatch = pathname.match(/^\/products\/([^/?#]+)$/i);
    if (productMatch?.[1]) {
      productHandles.push(decodeURIComponent(productMatch[1]));
      continue;
    }

    if (pathname.startsWith('/collections/')) {
      collectionPaths.push(pathname);
      continue;
    }

    // Candidate category path from already-canonical links
    if (
      !pathname.startsWith('/news') &&
      !pathname.startsWith('/blogs') &&
      !pathname.startsWith('/pages') &&
      !pathname.startsWith('/products') &&
      !pathname.startsWith('/collections')
    ) {
      const depth = pathname.split('/').filter(Boolean).length;
      if (depth >= 1 && depth <= 3) {
        canonicalPaths.push(pathname);
      }
    }
  }

  const uniqueHandles = [...new Set(productHandles)].slice(0, 12);

  let ctaPathHint: string | null = null;
  for (const cp of collectionPaths) {
    const mapped = collectionRedirects[cp];
    if (mapped) {
      ctaPathHint = mapped;
      break;
    }
  }
  if (!ctaPathHint && canonicalPaths.length > 0) {
    ctaPathHint = canonicalPaths[0];
  }

  return { productHandles: uniqueHandles, ctaPathHint };
}

