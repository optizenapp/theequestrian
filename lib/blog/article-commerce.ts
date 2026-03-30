import type { ShopifyProduct } from '@/types/shopify';
import { collectionRedirects } from '@/lib/redirects/maps';
import {
  getProductsByCategory,
  getRecommendedProducts,
  getProductCanonicalUrls,
  hasProductImage,
} from '@/lib/shopify/products';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { getProductOverridesByHandles } from '@/lib/content/product-overrides';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import type { ReviewStats } from '@/lib/reviews/stats';
import {
  DEFAULT_BLOG_SHOP_CTA,
  resolveCtaFromTagsAndTitle,
} from './tag-cta-defaults';

function parseHeadlessPath(path: string): {
  category: string;
  subcategory?: string;
  subsubcategory?: string;
} {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { category: 'horse' };
  }
  if (parts.length === 1) {
    return { category: parts[0] };
  }
  if (parts.length === 2) {
    return { category: parts[0], subcategory: parts[1] };
  }
  return {
    category: parts[0],
    subcategory: parts[1],
    subsubcategory: parts[2],
  };
}

function parseRelatedHandles(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeCategoryPath(path: string): string {
  const trimmed = (path || '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const clean = withSlash.split('?')[0].split('#')[0];
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

function resolveCategoryCtaPath(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  let input = path.trim();
  if (input.startsWith('http')) {
    try {
      input = new URL(input).pathname;
    } catch {
      return null;
    }
  }

  const normalized = normalizeCategoryPath(input);
  if (normalized.startsWith('/collections/')) {
    return collectionRedirects[normalized] || null;
  }

  const disallowedPrefixes = [
    '/news',
    '/blogs',
    '/products',
    '/pages',
    '/account',
    '/cart',
    '/search',
    '/api',
  ];
  if (disallowedPrefixes.some((p) => normalized === p || normalized.startsWith(`${p}/`))) {
    return null;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length < 1 || segments.length > 3) return null;
  return normalized;
}

function buildRelevanceTokens(article: BlogCommerceArticleInput, ctaPath: string): string[] {
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'your',
    'horse',
    'horses',
    'best',
    'guide',
    'review',
    'australia',
    'what',
    'how',
    'are',
    'from',
  ]);
  const source = `${article.title} ${article.tags.join(' ')} ${ctaPath}`.toLowerCase();
  return [...new Set(
    source
      .split(/[^a-z0-9]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !stop.has(t))
  )];
}

function scoreByRelevance(product: ShopifyProduct, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const title = product.title.toLowerCase();
  const handle = product.handle.toLowerCase();
  const type = (product.productType || '').toLowerCase();
  const vendor = (product.vendor || '').toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 3;
    if (type.includes(token)) score += 2;
    if (handle.includes(token)) score += 2;
    if (vendor.includes(token)) score += 1;
  }
  return score;
}

function sortProductsByRelevance(products: ShopifyProduct[], tokens: string[]): ShopifyProduct[] {
  if (products.length <= 1 || tokens.length === 0) return products;
  return [...products].sort((a, b) => {
    const aScore = scoreByRelevance(a, tokens);
    const bScore = scoreByRelevance(b, tokens);
    return bScore - aScore;
  });
}

export type BlogArticleCommerce = {
  ctaPath: string;
  ctaLabel: string;
  products: ShopifyProduct[];
  productHrefByHandle: Record<string, string>;
  reviewStatsMap: Record<string, ReviewStats>;
};

/** Commerce inputs from Neon article row or legacy Shopify article shape. */
export type BlogCommerceArticleInput = {
  title: string;
  tags: string[];
  headless?: {
    ctaPath?: string | null;
    ctaLabel?: string | null;
    relatedHandlesRaw?: string | null;
  } | null;
};

export async function loadBlogArticleCommerce(
  article: BlogCommerceArticleInput
): Promise<BlogArticleCommerce> {
  const fromMeta = resolveCategoryCtaPath(article.headless?.ctaPath);
  const fromTags = resolveCtaFromTagsAndTitle(article.tags, article.title);
  const fromTagsPath = resolveCategoryCtaPath(fromTags?.path);
  const ctaPath = fromMeta || fromTagsPath || DEFAULT_BLOG_SHOP_CTA.path;
  const ctaLabel =
    (fromMeta ? article.headless?.ctaLabel?.trim() : null) ||
    (fromTagsPath ? fromTags?.label : null) ||
    DEFAULT_BLOG_SHOP_CTA.label;

  const handles = parseRelatedHandles(article.headless?.relatedHandlesRaw);
  let products: ShopifyProduct[] = [];

  // Primary strategy: always source related products from the CTA category path.
  const normalizedPath = normalizeCategoryPath(ctaPath);
  const byCategory = await getProductsByCategory(normalizedPath, 24);
  products = byCategory.products;

  // Fallback: explicit curated handles (headless_related_handles / legacy split markers)
  if (products.length === 0) {
    const fetched = await getProductsByHandles(handles);
    const overrideMap = await getProductOverridesByHandles(handles);
    const ordered = handles
      .map((h) => fetched.find((p) => p.handle === h))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .filter((p) => p.availableForSale)
      .filter((p) => overrideMap.get(p.handle)?.is_published_headless !== false)
      .filter((p) => hasProductImage(p));
    products = ordered as ShopifyProduct[];
  }

  if (products.length === 0) {
    const { category, subcategory, subsubcategory } = parseHeadlessPath(ctaPath);
    const types = await getProductTypesForCollection(category, subcategory, subsubcategory);
    const primaryType = types[0];
    products = await getRecommendedProducts(24, primaryType, undefined);
  }

  if (products.length === 0) {
    products = await getRecommendedProducts(24, undefined, undefined);
  }

  products = products.filter((p) => p.availableForSale);
  products = products.filter((p) => hasProductImage(p));

  const tokens = buildRelevanceTokens(article, ctaPath);
  products = sortProductsByRelevance(products, tokens);
  products = products.slice(0, 4);

  const reviewStatsMapRaw = await getReviewStatsForProducts(products.map((p) => p.handle));
  const reviewStatsMap = Object.fromEntries(reviewStatsMapRaw);

  const urlMap = await getProductCanonicalUrls(products);
  const productHrefByHandle = Object.fromEntries(
    products.map((p) => [p.handle, urlMap.get(p.id) ?? `/products/${p.handle}`])
  );

  return {
    ctaPath,
    ctaLabel,
    products,
    productHrefByHandle,
    reviewStatsMap,
  };
}
