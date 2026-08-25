/**
 * GMC custom-label economics (price / margin / paid acquisition / stock / performance).
 * Thresholds are centralised so Shopping eligibility can be tuned later.
 */

/** Absolute contribution floors (AUD) for paid acquisition labels. */
export const PRIME_MIN_CONTRIBUTION = 20;
export const STRONG_MIN_CONTRIBUTION = 20;
export const TEST_MIN_CONTRIBUTION = 10;

/** Margin % floors for paid acquisition (full-precision classification). */
export const PAID_MIN_MARGIN_PCT = 20;
export const PRIME_MIN_MARGIN_PCT = 30;

/**
 * Negligible absolute epsilon on percentage-point / dollar comparisons to absorb
 * IEEE float artefacts (e.g. 20 becoming 19.999999999999996). Must NOT promote
 * genuinely-below-threshold economics (e.g. 19.995% stays below 20%).
 */
export const CLASSIFICATION_EPS = 1e-9;

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

/** Paid acquisition potential — custom_label_2. */
export type ProfitabilityLabel = 'prime' | 'strong' | 'test' | 'do_not_advertise';

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

function atLeast(value: number, threshold: number): boolean {
  return value + CLASSIFICATION_EPS >= threshold;
}

function below(value: number, threshold: number): boolean {
  return value + CLASSIFICATION_EPS < threshold;
}

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
  if (below(marginPercent, MARGIN_RANGE_1)) return 'margin_under_10';
  if (below(marginPercent, MARGIN_RANGE_2)) return 'margin_10_19';
  if (below(marginPercent, MARGIN_RANGE_3)) return 'margin_20_29';
  if (below(marginPercent, MARGIN_RANGE_4)) return 'margin_30_39';
  return 'margin_40_plus';
}

/** Preferred contribution when unit cost is known: price − cost. */
export function getGrossContributionFromCost(
  sellingPriceAud: number,
  unitCostAud: number | null | undefined
): number | null {
  if (!Number.isFinite(sellingPriceAud) || sellingPriceAud <= 0) return null;
  if (unitCostAud == null || !Number.isFinite(unitCostAud) || unitCostAud <= 0) return null;
  return sellingPriceAud - unitCostAud;
}

/** Fallback when only a margin % is known (e.g. margin:N tag). */
export function getGrossContributionFromMargin(
  sellingPriceAud: number,
  marginPercent: number | null
): number | null {
  if (marginPercent == null || !Number.isFinite(marginPercent)) return null;
  if (!Number.isFinite(sellingPriceAud) || sellingPriceAud < 0) return null;
  return sellingPriceAud * (marginPercent / 100);
}

/**
 * Paid acquisition label: requires BOTH healthy margin % and contribution $.
 * Evaluate DNA first, then prime → strong → test.
 */
export function getPaidAcquisitionLabel(
  marginPercent: number | null,
  grossContributionAud: number | null,
  _advertisedPriceAud?: number | null
): ProfitabilityLabel {
  if (marginPercent == null || !Number.isFinite(marginPercent)) {
    return 'do_not_advertise';
  }
  if (grossContributionAud == null || !Number.isFinite(grossContributionAud)) {
    return 'do_not_advertise';
  }
  if (below(marginPercent, PAID_MIN_MARGIN_PCT)) {
    return 'do_not_advertise';
  }
  if (below(grossContributionAud, TEST_MIN_CONTRIBUTION)) {
    return 'do_not_advertise';
  }

  if (
    atLeast(marginPercent, PRIME_MIN_MARGIN_PCT) &&
    atLeast(grossContributionAud, PRIME_MIN_CONTRIBUTION)
  ) {
    return 'prime';
  }

  if (
    atLeast(marginPercent, PAID_MIN_MARGIN_PCT) &&
    atLeast(grossContributionAud, STRONG_MIN_CONTRIBUTION)
  ) {
    return 'strong';
  }

  return 'test';
}

/** @deprecated Prefer getPaidAcquisitionLabel. */
export function getProfitabilityLabel(
  marginPercent: number | null,
  grossContributionAud: number | null,
  advertisedPriceAud?: number | null
): ProfitabilityLabel {
  return getPaidAcquisitionLabel(marginPercent, grossContributionAud, advertisedPriceAud);
}

export function getStockPressureLabel(input: {
  availableForSale: boolean;
  quantityAvailable?: number | null;
  tracked?: boolean | null;
  inventoryPolicy?: string | null;
}): StockPressureLabel {
  if (!input.availableForSale) return 'low_stock';

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
 * Qualitative tags (margin:high|medium|low) are intentionally ignored.
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

/** Full-precision margin % from unit cost — no business rounding. */
export function marginPercentFromUnitCost(
  sellingPriceAud: number,
  unitCostAud: number | null | undefined
): number | null {
  const contribution = getGrossContributionFromCost(sellingPriceAud, unitCostAud);
  if (contribution == null) return null;
  return (contribution / sellingPriceAud) * 100;
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
  const price = input.sellingPriceAud;
  const margin = resolveMargin({
    tags: input.tags,
    sellingPriceAud: price,
    unitCostAud: input.unitCostAud,
  });

  // Prefer price − cost when unit cost is the source; tag path uses price × rate.
  let grossContributionAud: number | null = null;
  if (margin.source === 'unit_cost') {
    grossContributionAud = getGrossContributionFromCost(price, input.unitCostAud);
  } else if (margin.source === 'tag') {
    grossContributionAud = getGrossContributionFromMargin(price, margin.marginPercent);
  }

  return {
    custom_label_0: getPriceTier(price),
    custom_label_1: getMarginRangeLabel(margin.marginPercent),
    custom_label_2: getPaidAcquisitionLabel(
      margin.marginPercent,
      grossContributionAud,
      price
    ),
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
