/**
 * Trailrace paid-shopping demand → GMC custom_label_3.
 * Evidence is time-bound (seed metadata); refresh CSV without changing feed code.
 */

import fs from 'fs';
import path from 'path';

export const TRAILRACE_DEMAND_SOURCE_START = '2026-05-01';
export const TRAILRACE_DEMAND_SOURCE_END = '2026-09-14';

export type TrailracePaidLabel =
  | 'tr_a'
  | 'tr_b'
  | 'tr_c'
  | 'tr_none'
  | 'tr_unmatched';

export type TrailraceMatchMethod =
  | 'variant_map'
  | 'sku'
  | 'normalized_title'
  | 'trailrace_presence'
  | 'none';

export type TrailraceDemandMatch = {
  label: TrailracePaidLabel;
  method: TrailraceMatchMethod;
  trailraceItemId: string | null;
  trailraceTitle: string | null;
  confidence: 'high' | 'ambiguous' | 'none';
  reviewReason: string | null;
};

export type TrailraceSeedRow = {
  trailraceItemId: string;
  trailraceProductId: string;
  trailraceVariantId: string;
  title: string;
  normalizedTitle: string;
  label: Exclude<TrailracePaidLabel, 'tr_none' | 'tr_unmatched'>;
  costAud: number;
  conversionValueAud: number;
  roas: number;
};

const LABEL_RANK: Record<Exclude<TrailracePaidLabel, 'tr_unmatched'>, number> = {
  tr_a: 3,
  tr_b: 2,
  tr_c: 1,
  tr_none: 0,
};

const VALID_SEED_LABELS = new Set(['tr_a', 'tr_b', 'tr_c']);

export function normalizeDemandTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\p{L}\p{N}\s./%'-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTrailraceAdsItemId(itemId: string): {
  productId: string;
  variantId: string;
} | null {
  const parts = itemId.trim().split('_');
  if (parts.length < 3) return null;
  const variantId = parts[parts.length - 1];
  const productId = parts[parts.length - 2];
  if (!/^\d+$/.test(variantId) || !/^\d+$/.test(productId)) return null;
  return { productId, variantId };
}

function strongerLabel(
  a: Exclude<TrailracePaidLabel, 'tr_unmatched'>,
  b: Exclude<TrailracePaidLabel, 'tr_unmatched'>
): Exclude<TrailracePaidLabel, 'tr_unmatched'> {
  return LABEL_RANK[a] >= LABEL_RANK[b] ? a : b;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(filePath: string): string[][] {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

export type TrailraceDemandIndex = {
  sourcePeriod: string;
  /** TE marketplace variant id → converting seed evidence */
  byMarketplaceVariantId: Map<string, TrailraceSeedRow>;
  /** TE marketplace variant id present in Trailrace Collective map */
  trailraceMarketplaceVariantIds: Set<string>;
  /** Any SKU observed on the Trailrace vendor map */
  trailraceSkus: Set<string>;
  /** Normalized SKU → seed row (unique only) */
  bySku: Map<string, TrailraceSeedRow>;
  ambiguousSkus: Set<string>;
  /** Normalized title → seed rows */
  byNormalizedTitle: Map<string, TrailraceSeedRow[]>;
  seedRows: TrailraceSeedRow[];
};

function resolveDataPath(...parts: string[]): string {
  return path.join(process.cwd(), 'data', 'gmc', ...parts);
}

export function loadTrailraceDemandIndex(options?: {
  seedPath?: string;
  mapPath?: string;
}): TrailraceDemandIndex {
  const seedPath = options?.seedPath ?? resolveDataPath('trailrace-paid-demand-seed.csv');
  const mapPath = options?.mapPath ?? resolveDataPath('trailrace-vendor-variant-map.csv');

  const seedTable = readCsv(seedPath);
  const seedHeader = seedTable[0] ?? [];
  const seedRowsRaw = seedTable.slice(1);
  const col = (name: string) => seedHeader.indexOf(name);

  const seedByTrailraceVariant = new Map<string, TrailraceSeedRow>();
  const seedRows: TrailraceSeedRow[] = [];
  const byNormalizedTitle = new Map<string, TrailraceSeedRow[]>();

  for (const row of seedRowsRaw) {
    const itemId = row[col('trailrace_item_id')] ?? '';
    const parsed = parseTrailraceAdsItemId(itemId);
    const labelRaw = (row[col('trailrace_paid_label')] ?? '').trim();
    if (!parsed || !VALID_SEED_LABELS.has(labelRaw)) continue;
    const title = row[col('trailrace_title')] ?? '';
    const entry: TrailraceSeedRow = {
      trailraceItemId: itemId,
      trailraceProductId: parsed.productId,
      trailraceVariantId: parsed.variantId,
      title,
      normalizedTitle: normalizeDemandTitle(title),
      label: labelRaw as TrailraceSeedRow['label'],
      costAud: Number(row[col('trailrace_cost_aud')] ?? NaN),
      conversionValueAud: Number(row[col('trailrace_conversion_value_aud')] ?? NaN),
      roas: Number(row[col('trailrace_roas')] ?? NaN),
    };
    seedRows.push(entry);
    seedByTrailraceVariant.set(entry.trailraceVariantId, entry);
    const list = byNormalizedTitle.get(entry.normalizedTitle) ?? [];
    list.push(entry);
    byNormalizedTitle.set(entry.normalizedTitle, list);
  }

  const mapTable = readCsv(mapPath);
  const mapHeader = mapTable[0] ?? [];
  const mapRows = mapTable.slice(1);
  const mcol = (name: string) => mapHeader.indexOf(name);

  const byMarketplaceVariantId = new Map<string, TrailraceSeedRow>();
  const trailraceMarketplaceVariantIds = new Set<string>();
  const trailraceSkus = new Set<string>();
  const bySku = new Map<string, TrailraceSeedRow>();
  const ambiguousSkus = new Set<string>();
  const skuHits = new Map<string, TrailraceSeedRow[]>();

  for (const row of mapRows) {
    const vendorVariantId = (row[mcol('vendor_shopify_variant_id')] ?? '').trim();
    const marketplaceVariantId = (row[mcol('marketplace_variant_id')] ?? '').trim();
    const sku = (row[mcol('sku')] ?? '').trim();
    if (marketplaceVariantId) {
      trailraceMarketplaceVariantIds.add(marketplaceVariantId);
    }
    if (sku) {
      trailraceSkus.add(sku);
    }

    const seed = vendorVariantId ? seedByTrailraceVariant.get(vendorVariantId) : undefined;
    if (seed && marketplaceVariantId) {
      byMarketplaceVariantId.set(marketplaceVariantId, seed);
      if (sku) {
        const hits = skuHits.get(sku) ?? [];
        hits.push(seed);
        skuHits.set(sku, hits);
      }
    }
  }

  for (const [sku, hits] of skuHits) {
    const labels = new Set(hits.map((h) => h.label));
    if (labels.size === 1) {
      bySku.set(sku, hits[0]);
    } else {
      ambiguousSkus.add(sku);
    }
  }

  return {
    sourcePeriod: `${TRAILRACE_DEMAND_SOURCE_START}/${TRAILRACE_DEMAND_SOURCE_END}`,
    byMarketplaceVariantId,
    trailraceMarketplaceVariantIds,
    trailraceSkus,
    bySku,
    ambiguousSkus,
    byNormalizedTitle,
    seedRows,
  };
}

function pickUniqueSeed(rows: TrailraceSeedRow[]): {
  seed: TrailraceSeedRow | null;
  ambiguous: boolean;
} {
  if (rows.length === 0) return { seed: null, ambiguous: false };
  const labels = new Set(rows.map((r) => r.label));
  if (labels.size > 1) return { seed: null, ambiguous: true };
  // Same label (or single row) — use strongest conversion value as representative
  const seed = rows.reduce((best, row) =>
    row.conversionValueAud >= best.conversionValueAud ? row : best
  );
  return { seed, ambiguous: false };
}

export function buildEquestrianTitleCandidates(input: {
  productTitle: string;
  variantTitle?: string | null;
  selectedOptions?: Array<{ name: string; value: string }> | null;
}): string[] {
  const titles = new Set<string>();
  const productTitle = input.productTitle.trim();
  if (productTitle) titles.add(productTitle);

  const variantTitle = input.variantTitle?.trim();
  if (variantTitle && variantTitle.toLowerCase() !== 'default title') {
    titles.add(`${productTitle} ${variantTitle}`);
    titles.add(`${productTitle} - ${variantTitle}`);
  }

  const opts = (input.selectedOptions ?? [])
    .map((o) => o.value.trim())
    .filter(Boolean);
  if (opts.length === 1) {
    titles.add(`${productTitle} ${opts[0]}`);
  }
  if (opts.length >= 2) {
    titles.add(`${productTitle} ${opts.join(' / ')}`);
    titles.add(`${productTitle} ${opts[0]} / ${opts[1]}`);
  }

  return [...titles];
}

export function resolveTrailracePaidDemand(
  index: TrailraceDemandIndex,
  input: {
    marketplaceVariantId: string;
    sku?: string | null;
    vendor?: string | null;
    productTitle: string;
    variantTitle?: string | null;
    selectedOptions?: Array<{ name: string; value: string }> | null;
  }
): TrailraceDemandMatch {
  const mapped = index.byMarketplaceVariantId.get(input.marketplaceVariantId);
  if (mapped) {
    return {
      label: mapped.label,
      method: 'variant_map',
      trailraceItemId: mapped.trailraceItemId,
      trailraceTitle: mapped.title,
      confidence: 'high',
      reviewReason: null,
    };
  }

  const sku = input.sku?.trim();
  if (sku) {
    if (index.ambiguousSkus.has(sku)) {
      return {
        label: 'tr_unmatched',
        method: 'sku',
        trailraceItemId: null,
        trailraceTitle: null,
        confidence: 'ambiguous',
        reviewReason: 'sku_maps_to_multiple_trailrace_labels',
      };
    }
    const bySku = index.bySku.get(sku);
    if (bySku) {
      return {
        label: bySku.label,
        method: 'sku',
        trailraceItemId: bySku.trailraceItemId,
        trailraceTitle: bySku.title,
        confidence: 'high',
        reviewReason: null,
      };
    }
  }

  const candidates = buildEquestrianTitleCandidates(input);
  const hits: TrailraceSeedRow[] = [];
  for (const title of candidates) {
    const key = normalizeDemandTitle(title);
    if (!key) continue;
    const rows = index.byNormalizedTitle.get(key);
    if (rows?.length) hits.push(...rows);
  }
  if (hits.length > 0) {
    const { seed, ambiguous } = pickUniqueSeed(hits);
    if (ambiguous || !seed) {
      return {
        label: 'tr_unmatched',
        method: 'normalized_title',
        trailraceItemId: hits[0]?.trailraceItemId ?? null,
        trailraceTitle: hits[0]?.title ?? null,
        confidence: 'ambiguous',
        reviewReason: 'ambiguous_title_match_multiple_labels',
      };
    }
    return {
      label: seed.label,
      method: 'normalized_title',
      trailraceItemId: seed.trailraceItemId,
      trailraceTitle: seed.title,
      confidence: 'high',
      reviewReason: null,
    };
  }

  // Confident Trailrace catalogue presence, but no conversion evidence in the seed window.
  if (
    index.trailraceMarketplaceVariantIds.has(input.marketplaceVariantId) ||
    (sku != null && sku.length > 0 && index.trailraceSkus.has(sku)) ||
    isTrailraceVendorName(input.vendor)
  ) {
    return {
      label: 'tr_none',
      method: 'trailrace_presence',
      trailraceItemId: null,
      trailraceTitle: null,
      confidence: 'high',
      reviewReason: null,
    };
  }

  return {
    label: 'tr_unmatched',
    method: 'none',
    trailraceItemId: null,
    trailraceTitle: null,
    confidence: 'none',
    reviewReason: null,
  };
}

function isTrailraceVendorName(vendor?: string | null): boolean {
  if (!vendor?.trim()) return false;
  const key = vendor.trim().toLowerCase().replace(/\s+/g, ' ');
  return key === 'trailrace' || key.startsWith('trailrace ');
}

/** Strongest converter label helper for tests / product-level rollups. */
export function strongestTrailraceLabel(
  labels: Array<Exclude<TrailracePaidLabel, 'tr_unmatched'>>
): Exclude<TrailracePaidLabel, 'tr_unmatched'> | null {
  if (!labels.length) return null;
  return labels.reduce((best, label) => strongerLabel(best, label));
}
