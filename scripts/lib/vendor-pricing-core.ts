/**
 * Pure helpers for the vendor pricing audit: expected-price math, drift
 * classification, and CSV serialization. No IO so it stays easy to reason about.
 */

export type PricingFlag =
  | 'OK'
  | 'PRICE_DRIFT'
  | 'COMPARE_DRIFT'
  | 'PRICE_AND_COMPARE_DRIFT'
  | 'LOCKED'
  | 'MISSING_VENDOR_VARIANT'
  | 'MISSING_MARKETPLACE_VARIANT';

export interface AuditRow {
  vendor: string;
  sku: string;
  marketplaceProductId: string;
  marketplaceVariantId: string;
  marketplaceStatus: string;
  vendorPrice: number | null;
  offset: number;
  expectedPrice: number | null;
  actualPrice: number | null;
  priceDiff: number | null;
  vendorCompareAt: number | null;
  expectedCompareAt: number | null;
  actualCompareAt: number | null;
  compareDiff: number | null;
  locked: boolean;
  flag: PricingFlag;
}

const TOLERANCE = 0.01;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Expected marketplace values: vendor price plus the shipping offset, mirroring
 * any vendor sale by preserving the discount ratio (same formula the webhook uses).
 */
export function expectedFromVendor(
  vendorPrice: number,
  vendorCompareAt: number | null,
  offset: number
): { expectedPrice: number; expectedCompareAt: number | null } {
  const expectedPrice = round2(vendorPrice + offset);
  let expectedCompareAt: number | null = null;
  if (vendorCompareAt != null && vendorCompareAt > vendorPrice && vendorPrice > 0) {
    const ratio = vendorPrice / vendorCompareAt;
    expectedCompareAt = round2(expectedPrice / ratio);
  }
  return { expectedPrice, expectedCompareAt };
}

function diff(actual: number | null, expected: number | null): number | null {
  if (actual == null && expected == null) return null;
  return round2((actual ?? 0) - (expected ?? 0));
}

/**
 * Decide the drift flag for a fully-joined row. Locked variants and missing
 * sides are reported as their own categories rather than counted as drift.
 */
export function classifyRow(
  priceDiff: number | null,
  compareDiff: number | null,
  locked: boolean
): PricingFlag {
  if (locked) return 'LOCKED';
  const priceOff = priceDiff != null && Math.abs(priceDiff) >= TOLERANCE;
  const compareOff = compareDiff != null && Math.abs(compareDiff) >= TOLERANCE;
  if (priceOff && compareOff) return 'PRICE_AND_COMPARE_DRIFT';
  if (priceOff) return 'PRICE_DRIFT';
  if (compareOff) return 'COMPARE_DRIFT';
  return 'OK';
}

export function buildDiffs(row: {
  actualPrice: number | null;
  expectedPrice: number | null;
  actualCompareAt: number | null;
  expectedCompareAt: number | null;
}): { priceDiff: number | null; compareDiff: number | null } {
  return {
    priceDiff: diff(row.actualPrice, row.expectedPrice),
    compareDiff: diff(row.actualCompareAt, row.expectedCompareAt),
  };
}

const CSV_HEADER = [
  'vendor',
  'sku',
  'marketplace_product_id',
  'marketplace_variant_id',
  'marketplace_status',
  'vendor_price',
  'offset',
  'expected_price',
  'actual_price',
  'price_diff',
  'vendor_compare_at',
  'expected_compare_at',
  'actual_compare_at',
  'compare_diff',
  'locked',
  'flag',
];

function cell(value: string | number | boolean | null): string {
  if (value == null) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function rowsToCsv(rows: AuditRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.vendor,
        r.sku,
        r.marketplaceProductId,
        r.marketplaceVariantId,
        r.marketplaceStatus,
        r.vendorPrice,
        r.offset,
        r.expectedPrice,
        r.actualPrice,
        r.priceDiff,
        r.vendorCompareAt,
        r.expectedCompareAt,
        r.actualCompareAt,
        r.compareDiff,
        r.locked,
        r.flag,
      ]
        .map(cell)
        .join(',')
    );
  }
  return lines.join('\n');
}
