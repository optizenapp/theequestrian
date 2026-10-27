/**
 * Shared colour/size facet building and matching. One normalisation path for
 * facet options, labels, counts, URL values and product matching.
 */

import type { ShopifyProduct } from '@/types/shopify';
import { classifyOptionName, type FacetOptionType } from '@/lib/filters/option-classify';
import { colourKey, colourLabel, looseColourKey } from '@/lib/filters/colour-normalize';
import { sizeKey, sizeLabel, looseSizeKey } from '@/lib/filters/size-normalize';

type Variant = ShopifyProduct['variants']['edges'][number]['node'];

export interface FacetValue {
  /** URL/filter value: the most common display label for the group. */
  value: string;
  label: string;
  /** Distinct products, not variants. */
  count: number;
}

const NORMALISERS: Record<FacetOptionType, {
  key: (raw: string) => string | null;
  label: (raw: string) => string;
  loose: (raw: string) => string;
}> = {
  colour: { key: colourKey, label: colourLabel, loose: looseColourKey },
  size: { key: sizeKey, label: sizeLabel, loose: looseSizeKey },
};

function rawOptionValue(variant: Variant, type: FacetOptionType): string | null {
  const option = variant.selectedOptions.find((opt) => classifyOptionName(opt.name) === type);
  return option ? option.value : null;
}

export function variantFacetKey(variant: Variant, type: FacetOptionType): string | null {
  const raw = rawOptionValue(variant, type);
  return raw === null ? null : NORMALISERS[type].key(raw);
}

/** True when two filter values (URL or facet) refer to the same group. */
export function sameFacetValue(type: FacetOptionType, a: string, b: string): boolean {
  return NORMALISERS[type].loose(a) === NORMALISERS[type].loose(b);
}

/** Selected URL values → comparison keys. Empty set (not null) when values were given but none survive, so filters never broaden. */
function selectedKeys(values: string[] | undefined, type: FacetOptionType): Set<string> | null {
  if (!values || values.length === 0) return null;
  return new Set(values.map((v) => NORMALISERS[type].loose(v)).filter(Boolean));
}

/**
 * Keep products with at least one variant satisfying every selected option group,
 * so colour + size must exist on the same variant.
 */
export function filterProductsByOptions<T extends ShopifyProduct>(
  products: T[],
  filters: { sizes?: string[]; colors?: string[] }
): T[] {
  const sizes = selectedKeys(filters.sizes, 'size');
  const colours = selectedKeys(filters.colors, 'colour');
  if (!sizes && !colours) return products;

  return products.filter((product) =>
    product.variants.edges.some(({ node }) => {
      if (sizes && !sizes.has(variantFacetKey(node, 'size') ?? '')) return false;
      if (colours && !colours.has(variantFacetKey(node, 'colour') ?? '')) return false;
      return true;
    })
  );
}

function mostFrequent(labels: Map<string, number>): string {
  let best = '';
  let bestCount = -1;
  for (const [label, count] of labels) {
    if (count > bestCount || (count === bestCount && label < best)) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function compareSizes(a: FacetValue, b: FacetValue): number {
  const aNum = parseFloat(a.label);
  const bNum = parseFloat(b.label);
  if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
  return a.label.localeCompare(b.label);
}

export function buildFacetValues(products: ShopifyProduct[], type: FacetOptionType): FacetValue[] {
  const groups = new Map<string, { productIds: Set<string>; labels: Map<string, number> }>();

  for (const product of products) {
    for (const { node } of product.variants.edges) {
      const raw = rawOptionValue(node, type);
      if (raw === null) continue;
      const key = NORMALISERS[type].key(raw);
      if (!key) continue;
      const group = groups.get(key) ?? { productIds: new Set<string>(), labels: new Map<string, number>() };
      group.productIds.add(product.id);
      const label = NORMALISERS[type].label(raw);
      group.labels.set(label, (group.labels.get(label) ?? 0) + 1);
      groups.set(key, group);
    }
  }

  const values = Array.from(groups.values()).map((group) => {
    const label = mostFrequent(group.labels);
    return { value: label, label, count: group.productIds.size };
  });
  return type === 'size'
    ? values.sort(compareSizes)
    : values.sort((a, b) => a.label.localeCompare(b.label));
}
