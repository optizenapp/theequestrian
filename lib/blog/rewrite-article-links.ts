import * as cheerio from 'cheerio';
import { collectionRedirects } from '@/lib/redirects/maps';
import { getManualRedirect } from '@/lib/redirects/manual';
import {
  getProductByHandle,
  getProductCanonicalUrl,
  getPrimaryCategoryPath,
} from '@/lib/shopify/products';
import { getProductOverrideByHandle } from '@/lib/content/product-overrides';
import { getProductAllocationByHandle } from '@/lib/db/product-allocations';
import { findBestCategoryPathForSegment } from './category-fallback';

const STATIC_INTERNAL_HOSTS = new Set(['theequestrian.com.au', 'www.theequestrian.com.au']);

function normalizePathname(pathname: string): string {
  try {
    const decoded = decodeURIComponent(pathname);
    let p = decoded.split('?')[0].split('#')[0];
    if (!p.startsWith('/')) p = `/${p}`;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  } catch {
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  }
}

function getSiteHosts(): Set<string> {
  const hosts = new Set(STATIC_INTERNAL_HOSTS);
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (base) {
    try {
      hosts.add(new URL(base).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

function isMyShopifyHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.myshopify.com');
}

function isInternalHost(hostname: string, siteHosts: Set<string>): boolean {
  const h = hostname.toLowerCase();
  return siteHosts.has(h) || isMyShopifyHost(h);
}

const PRODUCT_PATH = /^\/products\/([^/?#]+)\/?$/i;
const COLLECTION_PATH = /^\/collections\/([^/?#]+)\/?$/i;

async function resolveProductHandle(handle: string): Promise<string> {
  const decoded = decodeURIComponent(handle);
  const product = await getProductByHandle(decoded);
  if (product) {
    const override = await getProductOverrideByHandle(decoded);
    if (override?.is_published_headless === false) {
      const cat = await getPrimaryCategoryPath(product.productType || '');
      return cat || '/';
    }
    return getProductCanonicalUrl(product);
  }

  const manual = await getManualRedirect(`/products/${decoded}`);
  if (manual) return normalizePathname(manual.to);

  const alloc = await getProductAllocationByHandle(decoded);
  if (alloc?.category_path) {
    return normalizePathname(alloc.category_path);
  }
  if (alloc?.canonical_path) {
    const parts = alloc.canonical_path.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? `/${parts.join('/')}` : '/';
  }

  const guess = await findBestCategoryPathForSegment(decoded);
  return guess ? normalizePathname(guess) : '/';
}

async function resolveCollectionPath(pathname: string): Promise<string> {
  const normalized = normalizePathname(pathname);
  const mapped = collectionRedirects[normalized];
  if (mapped) return normalizePathname(mapped);

  const manual = await getManualRedirect(normalized);
  if (manual) return normalizePathname(manual.to);

  const m = normalized.match(COLLECTION_PATH);
  if (m?.[1]) {
    const guess = await findBestCategoryPathForSegment(m[1]);
    if (guess) return normalizePathname(guess);
  }

  return normalized;
}

/**
 * Rewrite internal <a href> targets to headless canonical paths (products, collections).
 * Preserves external links and in-page anchors.
 */
export async function rewriteInternalArticleLinks(html: string): Promise<string> {
  if (!html || !html.includes('<')) return html;

  const siteHosts = getSiteHosts();
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://theequestrian.com.au';

  const $ = cheerio.load(html, undefined, false);

  const productHandles = new Set<string>();
  const collectionPaths = new Set<string>();
  const manualPaths = new Set<string>();

  const anchors = $('a[href]').toArray();
  for (const el of anchors) {
    const raw = $(el).attr('href');
    if (!raw || raw.startsWith('#') || raw.toLowerCase().startsWith('mailto:')) continue;
    if (raw.toLowerCase().startsWith('javascript:')) continue;

    let url: URL;
    try {
      url = new URL(raw, `${base}/`);
    } catch {
      continue;
    }

    if (!isInternalHost(url.hostname, siteHosts)) continue;

    const pathname = normalizePathname(url.pathname);
    if (pathname.startsWith('/news') || pathname === '/news') continue;

    const pm = pathname.match(PRODUCT_PATH);
    if (pm?.[1]) {
      productHandles.add(decodeURIComponent(pm[1]));
      continue;
    }

    const cm = pathname.match(/^\/collections\//i);
    if (cm) {
      collectionPaths.add(pathname);
      continue;
    }

    if (pathname.startsWith('/pages/')) {
      manualPaths.add(pathname);
    }
  }

  const productTarget = new Map<string, string>();
  await Promise.all(
    [...productHandles].map(async (h) => {
      const to = await resolveProductHandle(h);
      productTarget.set(h, to);
    })
  );

  const collectionTarget = new Map<string, string>();
  await Promise.all(
    [...collectionPaths].map(async (p) => {
      const to = await resolveCollectionPath(p);
      collectionTarget.set(p, to);
    })
  );

  const manualTarget = new Map<string, string>();
  await Promise.all(
    [...manualPaths].map(async (p) => {
      const manual = await getManualRedirect(p);
      if (manual) manualTarget.set(p, normalizePathname(manual.to));
    })
  );

  for (const el of anchors) {
    const raw = $(el).attr('href');
    if (!raw || raw.startsWith('#') || raw.toLowerCase().startsWith('mailto:')) continue;
    if (raw.toLowerCase().startsWith('javascript:')) continue;

    let url: URL;
    try {
      url = new URL(raw, `${base}/`);
    } catch {
      continue;
    }

    if (!isInternalHost(url.hostname, siteHosts)) continue;

    const pathname = normalizePathname(url.pathname);
    if (pathname.startsWith('/news')) continue;

    const pm = pathname.match(PRODUCT_PATH);
    if (pm?.[1]) {
      const handle = decodeURIComponent(pm[1]);
      const to = productTarget.get(handle);
      if (to) $(el).attr('href', to + url.hash);
      continue;
    }

    if (pathname.match(/^\/collections\//i)) {
      const to = collectionTarget.get(pathname);
      if (to) $(el).attr('href', to + url.hash);
      continue;
    }

    if (pathname.startsWith('/pages/')) {
      const to = manualTarget.get(pathname);
      if (to) $(el).attr('href', to + url.hash);
    }
  }

  return $.root().html() ?? html;
}
