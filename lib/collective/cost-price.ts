/**
 * Shopify Collective writes the supplier's wholesale cost to each imported variant's
 * inventoryItem.unitCost (= supplier retail × the supplier's retailer margin).
 * Supplier retail is therefore recoverable as cost ÷ margin.
 */

/** Ratio clusters holding at least this share of a vendor's variants are treated as real margins. */
const MARGIN_MIN_SHARE = 0.1;
/** Smaller clusters still count when they sit exactly on a round margin (drift scatters, margins don't). */
const ROUND_MARGINS = new Set(['0.60', '0.65', '0.70', '0.75', '0.80', '0.85', '0.90']);
const ROUND_MARGIN_MIN_COUNT = 5;

export const ratioKey = (cost: number, price: number) => (cost / price).toFixed(2);

/** Margins for one vendor: accepted cost/price ratios, most common first. */
export function detectVendorMargins(ratios: string[]): number[] {
  const counts = new Map<string, number>();
  for (const r of ratios) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([r, n]) => {
      const v = Number(r);
      if (!(v > 0 && v < 1)) return false;
      return n / ratios.length >= MARGIN_MIN_SHARE || (ROUND_MARGINS.has(r) && n >= ROUND_MARGIN_MIN_COUNT);
    })
    .sort((a, b) => b[1] - a[1])
    .map(([r]) => Number(r));
}

/** `retail × margin` rounds (half-cent either way) to `cost`. Floating point makes x.xx5 land on both sides. */
function costReproduces(retail: number, margin: number, cost: number): boolean {
  return Math.abs(retail * margin - cost) <= 0.005 + 1e-6;
}

/** True when the price reproduces `cost` for one of the vendor's margins. */
export function priceMatchesCost(price: number, cost: number, margins: number[]): boolean {
  return margins.some((m) => costReproduces(price, m, cost));
}

const cents = (n: number) => Math.round(n * 100) / 100;

function niceness(price: number): number {
  const c = Math.round(price * 100) % 100;
  if (c === 0) return 3;
  if (c % 5 === 0 || c === 99 || c === 95) return 2;
  return 0;
}

/**
 * Smallest-error retail price whose cost (retail × margin, rounded to cents) equals `cost`.
 * Ties prefer round-looking prices (.00 / .x5 / .99). Null when nothing reproduces the cost.
 */
export function retailFromCost(cost: number, margin: number): number | null {
  const base = cents(cost / margin);
  const candidates: number[] = [];
  for (let d = -3; d <= 3; d++) {
    const r = cents(base + d / 100);
    if (r > 0 && costReproduces(r, margin, cost)) candidates.push(r);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => niceness(b) - niceness(a) || Math.abs(a - base) - Math.abs(b - base));
  return candidates[0];
}
