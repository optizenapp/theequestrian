import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { isBlockedBrandHandle } from '@/lib/brands/blocked-brands';
import {
  getBrandSizing,
  matchBrandSizingByContext,
  type BrandSizing,
  type BrandSizingContext,
} from '@/lib/sizing/sizing-config';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';

export type { ResolvedBrandSizing, ResolvedBrandSizingSource } from '@/lib/sizing/types';

/** Neon hub handle → sizing-config slug when they differ. */
const HUB_TO_SIZING_SLUG: Record<string, string> = {
  tucci: 'tucci-and-ego-7',
  'diamond-deluxe-horsewear': 'diamond-deluxe',
  'jp-equestrian-fashion': 'jp-equestrian',
};

function sanitizeSizingHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .trim();
}

function fromConfig(brand: BrandSizing): ResolvedBrandSizing {
  const charts = (brand.charts || []).filter(
    (chart) =>
      !chart.isPlaceholder &&
      chart.images.some((src) => src && !src.includes('placeholder'))
  );
  return {
    handle: brand.slug,
    displayName: brand.displayName,
    source: charts.length > 0 || (brand.textCharts?.length ?? 0) > 0 ? 'config' : 'empty',
    sizingHtml: null,
    sourceUrl: null,
    charts,
    textCharts: brand.textCharts || [],
    sizingPagePath: `/sizing/${brand.slug}`,
  };
}

function emptyResult(handle: string, displayName: string): ResolvedBrandSizing {
  return {
    handle,
    displayName,
    source: 'empty',
    sizingHtml: null,
    sourceUrl: null,
    charts: [],
    textCharts: [],
    sizingPagePath: null,
  };
}

/**
 * Resolve brand sizing for a Neon brand hub handle.
 * Prefer Neon sizing_html; fall back to lib/sizing/sizing-config.ts.
 */
export async function getBrandSizingForHandle(
  handle: string,
  displayNameFallback?: string | null
): Promise<ResolvedBrandSizing> {
  const normalized = handle.trim().toLowerCase();
  if (!normalized || isBlockedBrandHandle(normalized)) {
    return emptyResult(normalized, displayNameFallback?.trim() || 'Brand');
  }

  const brandRow = await getBrandContentByHandle(normalized);
  const displayName =
    brandRow?.breadcrumb_label?.trim() ||
    brandRow?.title?.trim() ||
    displayNameFallback?.trim() ||
    normalized;

  const neonHtml = brandRow?.sizing_html?.trim();
  if (neonHtml) {
    return {
      handle: normalized,
      displayName,
      source: 'neon',
      sizingHtml: sanitizeSizingHtml(neonHtml),
      sourceUrl: brandRow?.sizing_source_url?.trim() || null,
      charts: [],
      textCharts: [],
      sizingPagePath: `/sizing/${normalized}`,
    };
  }

  const sizingSlug = HUB_TO_SIZING_SLUG[normalized] || normalized;
  const bySlug = getBrandSizing(sizingSlug) || getBrandSizing(normalized);
  if (bySlug) {
    return {
      ...fromConfig(bySlug),
      handle: normalized,
      displayName: bySlug.displayName || displayName,
    };
  }

  const byContext = matchBrandSizingByContext({
    handle: normalized,
    title: displayName,
    vendor: displayName,
  });
  if (byContext) {
    return {
      ...fromConfig(byContext),
      handle: normalized,
      displayName: byContext.displayName || displayName,
    };
  }

  return emptyResult(normalized, displayName);
}

/**
 * Resolve sizing for a PDP. Prefer Neon brand hub handle, then vendor/title match.
 */
export async function getBrandSizingForProduct(context: {
  brandHubHandle?: string | null;
  brandDisplayName?: string | null;
  vendor?: string | null;
  title?: string | null;
  handle?: string | null;
  productType?: string | null;
}): Promise<ResolvedBrandSizing> {
  if (context.brandHubHandle?.trim()) {
    return getBrandSizingForHandle(context.brandHubHandle, context.brandDisplayName);
  }

  const matched = matchBrandSizingByContext({
    vendor: context.vendor,
    title: context.title,
    handle: context.handle,
    productType: context.productType,
  } satisfies BrandSizingContext);

  if (matched) {
    const neon = await getBrandSizingForHandle(matched.slug, matched.displayName);
    if (neon.source !== 'empty') {
      return neon;
    }
    return fromConfig(matched);
  }

  return emptyResult(
    context.handle?.trim() || '',
    context.brandDisplayName || context.vendor || 'Brand'
  );
}

export function resolvedSizingHasContent(sizing: ResolvedBrandSizing): boolean {
  if (sizing.sizingHtml && sizing.sizingHtml.length > 0) return true;
  if (sizing.charts.length > 0) return true;
  if (sizing.textCharts.length > 0) return true;
  return false;
}
