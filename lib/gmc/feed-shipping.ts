/**
 * GMC feed shipping — Shopify Collective Carrier Service rates (cached).
 * Source of truth: draftOrderCalculate → collective_shipping_rates.
 * Variant miss falls back to any cached rate for the same product.
 */
import {
  getCollectiveShippingRatesByProductIds,
  getCollectiveShippingRatesByVariantIds,
  type CollectiveShippingRateRow,
} from '@/lib/db/collective-shipping-rates';
import { tagsIndicateFreeShipping } from '@/lib/shipping/free-shipping';

export type GmcShippingResolution = {
  rateAud: number | null;
  shippingLabel: string;
  shippingXml: string;
};

export type CollectiveShippingLookups = {
  byVariant: Map<string, CollectiveShippingRateRow>;
  byProduct: Map<string, CollectiveShippingRateRow>;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripGid(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

export function formatShippingLabel(rateAud: number | null): string {
  if (rateAud === null) return 'unmapped';
  if (rateAud === 0) return 'free';
  return `aud_${rateAud.toFixed(2)}`;
}

function buildShippingXml(rateAud: number | null, shippingLabel: string): string {
  if (rateAud === null) {
    return `<g:shipping_label>${escapeXml(shippingLabel)}</g:shipping_label>`;
  }
  return [
    '<g:shipping>',
    '<g:country>AU</g:country>',
    `<g:price>${escapeXml(`${rateAud.toFixed(2)} AUD`)}</g:price>`,
    '</g:shipping>',
    `<g:shipping_label>${escapeXml(shippingLabel)}</g:shipping_label>`,
  ].join('');
}

export function pickCollectiveRateForVariant(input: {
  lookups: CollectiveShippingLookups;
  variantId: string;
  productId: string;
}): CollectiveShippingRateRow | null {
  const variantId = stripGid(input.variantId);
  const productId = stripGid(input.productId);
  return input.lookups.byVariant.get(variantId) ?? input.lookups.byProduct.get(productId) ?? null;
}

export function resolveGmcShippingFromCollectiveRate(input: {
  tags: string[];
  collectiveRate: CollectiveShippingRateRow | null | undefined;
}): GmcShippingResolution {
  if (tagsIndicateFreeShipping(input.tags)) {
    const shippingLabel = 'free';
    return {
      rateAud: 0,
      shippingLabel,
      shippingXml: buildShippingXml(0, shippingLabel),
    };
  }

  if (!input.collectiveRate) {
    const shippingLabel = 'unmapped';
    return {
      rateAud: null,
      shippingLabel,
      shippingXml: buildShippingXml(null, shippingLabel),
    };
  }

  const rateAud = Number(input.collectiveRate.standard_rate_aud);
  if (!Number.isFinite(rateAud)) {
    const shippingLabel = 'unmapped';
    return {
      rateAud: null,
      shippingLabel,
      shippingXml: buildShippingXml(null, shippingLabel),
    };
  }

  const shippingLabel = formatShippingLabel(rateAud);
  return {
    rateAud,
    shippingLabel,
    shippingXml: buildShippingXml(rateAud, shippingLabel),
  };
}

/** Prefetch Collective rates by variant, plus product-level fallback rows. */
export async function loadCollectiveShippingLookups(input: {
  variantIds: string[];
  productIds: string[];
}): Promise<CollectiveShippingLookups> {
  const [byVariant, byProduct] = await Promise.all([
    getCollectiveShippingRatesByVariantIds(input.variantIds.map(stripGid)),
    getCollectiveShippingRatesByProductIds(input.productIds.map(stripGid)),
  ]);
  return { byVariant, byProduct };
}

/** @deprecated Prefer loadCollectiveShippingLookups for product fallback. */
export async function loadCollectiveShippingRateMap(
  variantIds: string[]
): Promise<Map<string, CollectiveShippingRateRow>> {
  return getCollectiveShippingRatesByVariantIds(variantIds.map(stripGid));
}

/** Distinct rate labels present in a rate map (for GMC account shipping services). */
export function collectRateBucketsFromMap(
  rateMap: Map<string, CollectiveShippingRateRow>
): Array<{ label: string; rateAud: number }> {
  const bucketMap = new Map<string, number>();
  bucketMap.set('free', 0);
  for (const row of rateMap.values()) {
    const rate = Number(row.standard_rate_aud);
    if (!Number.isFinite(rate)) continue;
    bucketMap.set(formatShippingLabel(rate), rate);
  }
  return [...bucketMap.entries()]
    .map(([label, rateAud]) => ({ label, rateAud }))
    .sort((a, b) => a.rateAud - b.rateAud || a.label.localeCompare(b.label));
}
