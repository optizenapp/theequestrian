/**
 * GMC custom-label economics (price / margin / contribution / stock / performance).
 * Thresholds are centralised so Shopping eligibility can be tuned later.
 */

export const TIER_1_MIN_CONTRIBUTION = 20;
export const TIER_2_MIN_CONTRIBUTION = 10;
export const TIER_3_MIN_CONTRIBUTION = 6;

/** Margin band cutovers (%). Ranges are [lower, next). */
export const MARGIN_RANGE_1 = 10;
export const MARGIN_RANGE_2 = 20;
export const MARGIN_RANGE_3 = 30;
export const MARGIN_RANGE_4 = 40;

/** Tracked inventory at or above this quantity is high_stock. */
export const HIGH_STOCK_MIN_QUANTITY = 5;

export type PriceTierLabel =
  | 'under_50'
  | '50_to_100'
  | '100_to_150'
  | '150_to_300'
  | '300_plus';

export type MarginRangeLabel =
  | 'margin_under_10'
  | 'margin_10_19'
  | 'margin_20_29'
  | 'margin_30_39'
  | 'margin_40_plus'
  | 'unknown';

export type ProfitabilityLabel = 'tier_1' | 'tier_2' | 'tier_3' | 'do_not_advertise';

export type StockPressureLabel = 'high_stock' | 'low_stock';

export type PerformanceLabel = 'bestseller' | 'slow_mover' | 'unknown';

export type GmcCustomLabels = {
  custom_label_0: PriceTierLabel;
  custom_label_1: MarginRangeLabel;
  custom_label_2: ProfitabilityLabel;
  custom_label_3: StockPressureLabel;
  custom_label_4: PerformanceLabel;
};

export type MarginResolution = {
  /** Exact margin percentage (e.g. 17.5), or null when unknown. */
  marginPercent: number | null;
  source: 'tag' | 'unit_cost' | 'unknown';
};

export function getPriceTier(sellingPriceAud: number): PriceTierLabel {
  if (!Number.isFinite(sellingPriceAud) || sellingPriceAud < 0) {
    return 'under_50';
  }
  if (sellingPriceAud < 50) return 'under_50';
  if (sellingPriceAud < 100) return '50_to_100';
  if (sellingPriceAud < 150) return '100_to_150';
  if (sellingPriceAud < 300) return '150_to_300';
  return '300_plus';
}

export function getMarginRangeLabel(marginPercent: number | null): MarginRangeLabel {
  if (marginPercent == null || !Number.isFinite(marginPercent)) return 'unknown';
  if (marginPercent < MARGIN_RANGE_1) return 'margin_under_10';
  if (marginPercent < MARGIN_RANGE_2) return 'margin_10_19';
  if (marginPercent < MARGIN_RANGE_3) return 'margin_20_29';
  if (marginPercent < MARGIN_RANGE_4) return 'margin_30_39';
  return 'margin_40_plus';
}

export function getGrossContribution(
  sellingPriceAud: number,
  marginPercent: number | null
): number | null {
  if (marginPercent == null || !Number.isFinite(marginPercent)) return null;
  if (!Number.isFinite(sellingPriceAud) || sellingPriceAud < 0) return null;
  return sellingPriceAud * (marginPercent / 100);
}

export function getProfitabilityLabel(grossContributionAud: number | null): ProfitabilityLabel {
  if (grossContributionAud == null || !Number.isFinite(grossContributionAud)) {
    return 'do_not_advertise';
  }
  if (grossContributionAud >= TIER_1_MIN_CONTRIBUTION) return 'tier_1';
  if (grossContributionAud >= TIER_2_MIN_CONTRIBUTION) return 'tier_2';
  if (grossContributionAud >= TIER_3_MIN_CONTRIBUTION) return 'tier_3';
  return 'do_not_advertise';
}

export function getStockPressureLabel(input: {
  availableForSale: boolean;
  quantityAvailable?: number | null;
  tracked?: boolean | null;
  inventoryPolicy?: string | null;
}): StockPressureLabel {
  if (!input.availableForSale) return 'low_stock';

  // Supplier-managed / unlimited: do not treat missing local qty as low stock.
  if (input.tracked === false || input.inventoryPolicy === 'CONTINUE') {
    return 'high_stock';
  }
  if (input.quantityAvailable == null) {
    return 'high_stock';
  }
  return input.quantityAvailable >= HIGH_STOCK_MIN_QUANTITY ? 'high_stock' : 'low_stock';
}

export function getPerformanceLabel(tags: string[]): PerformanceLabel {
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  if (normalized.some((tag) => tag.includes('bestseller') || tag.includes('best seller'))) {
    return 'bestseller';
  }
  if (
    normalized.some(
      (tag) => tag.includes('slow_mover') || tag.includes('slow mover') || tag.includes('clearance')
    ) ||
    normalized.some((tag) => /(^|[^a-z])slow([^a-z]|$)/.test(tag))
  ) {
    return 'slow_mover';
  }
  return 'unknown';
}

/**
 * Parse exact margin from tags like `margin:17`, `margin:17%`, `margin:17.5`.
 * Qualitative tags (margin:high|medium|low) are intentionally ignored — they are
 * not exact percentages and must not drive profitability.
 */
export function parseExactMarginPercentFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const match = tag.trim().match(/^margin\s*:\s*(\d+(?:\.\d+)?)\s*%?$/i);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    return value;
  }
  return null;
}

export function marginPercentFromUnitCost(
  sellingPriceAud: number,
  unitCostAud: number | null | undefined
): number | null {
  if (!Number.isFinite(sellingPriceAud) || sellingPriceAud <= 0) return null;
  if (unitCostAud == null || !Number.isFinite(unitCostAud) || unitCostAud <= 0) return null;
  const raw = ((sellingPriceAud - unitCostAud) / sellingPriceAud) * 100;
  // Money is 2dp; round so e.g. 9.997% from cost/price noise lands on 10.00%.
  return Math.round(raw * 100) / 100;
}

export function resolveMargin(input: {
  tags: string[];
  sellingPriceAud: number;
  unitCostAud?: number | null;
}): MarginResolution {
  const fromTag = parseExactMarginPercentFromTags(input.tags);
  if (fromTag != null) {
    return { marginPercent: fromTag, source: 'tag' };
  }
  const fromCost = marginPercentFromUnitCost(input.sellingPriceAud, input.unitCostAud);
  if (fromCost != null) {
    return { marginPercent: fromCost, source: 'unit_cost' };
  }
  return { marginPercent: null, source: 'unknown' };
}

export function buildGmcCustomLabels(input: {
  sellingPriceAud: number;
  tags: string[];
  unitCostAud?: number | null;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  tracked?: boolean | null;
  inventoryPolicy?: string | null;
}): GmcCustomLabels & {
  marginPercent: number | null;
  marginSource: MarginResolution['source'];
  grossContributionAud: number | null;
} {
  const margin = resolveMargin({
    tags: input.tags,
    sellingPriceAud: input.sellingPriceAud,
    unitCostAud: input.unitCostAud,
  });
  const grossContributionAud = getGrossContribution(input.sellingPriceAud, margin.marginPercent);

  return {
    custom_label_0: getPriceTier(input.sellingPriceAud),
    custom_label_1: getMarginRangeLabel(margin.marginPercent),
    custom_label_2: getProfitabilityLabel(grossContributionAud),
    custom_label_3: getStockPressureLabel({
      availableForSale: input.availableForSale,
      quantityAvailable: input.quantityAvailable,
      tracked: input.tracked,
      inventoryPolicy: input.inventoryPolicy,
    }),
    custom_label_4: getPerformanceLabel(input.tags),
    marginPercent: margin.marginPercent,
    marginSource: margin.source,
    grossContributionAud,
  };
}
