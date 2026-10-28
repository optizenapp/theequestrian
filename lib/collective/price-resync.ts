/**
 * Keep Shopify Collective variant prices equal to the supplier's retail price.
 * Supplier retail = Collective cost ÷ the vendor's margin (see cost-price.ts).
 * Corrections always use the vendor's most common margin; secondary margins only mark prices as correct.
 */
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import { isMarketplaceVariantPriceLocked } from '@/lib/inventory/vendor-sync/repository';
import { detectVendorMargins, priceMatchesCost, ratioKey, retailFromCost } from './cost-price';
import { collectiveVariantCost, fetchCollectiveProducts, type CollectiveProduct } from './fetch-collective-variants';

/** Vendors whose secondary cost/price cluster was verified as mispricing, not a real margin. */
export const COLLECTIVE_PRIMARY_ONLY_VENDORS = ['Exclusively Equine'];

const LARGE_CHANGE_DROP = 0.4;

export type ResyncAction = 'ok' | 'no_cost' | 'no_margin' | 'no_exact_retail' | 'skip_locked' | 'skip_large_drop' | 'update';

export type ResyncRow = {
  action: ResyncAction;
  vendor: string;
  handle: string;
  status: string;
  variantId: string;
  variantTitle: string;
  cost: number;
  margin: number | null;
  currentPrice: number;
  currentCompareAt: number | null;
  targetPrice: number | null;
  targetCompareAt: number | null;
};

export type ResyncPlan = { rows: ResyncRow[]; summary: Record<string, Partial<Record<ResyncAction, number>>> };

export async function planCollectivePriceResync(options: {
  vendor?: string;
  primaryOnly?: string[];
  holdLargeDrops?: boolean;
} = {}): Promise<ResyncPlan> {
  const primaryOnly = new Set(options.primaryOnly ?? COLLECTIVE_PRIMARY_ONLY_VENDORS);
  const products = await fetchCollectiveProducts(options.vendor);
  const byVendor = new Map<string, CollectiveProduct[]>();
  for (const p of products) byVendor.set(p.vendor, [...(byVendor.get(p.vendor) ?? []), p]);

  const rows: ResyncRow[] = [];
  const summary: ResyncPlan['summary'] = {};
  for (const [vendor, list] of byVendor) {
    const variants = list.flatMap((p) => p.variants.nodes.map((v) => ({ p, v })));
    const detected = detectVendorMargins(
      variants.filter(({ v }) => collectiveVariantCost(v) > 0).map(({ v }) => ratioKey(collectiveVariantCost(v), Number(v.price)))
    );
    const margins = primaryOnly.has(vendor) ? detected.slice(0, 1) : detected;
    const tally: Partial<Record<ResyncAction, number>> = {};
    summary[`${vendor} [${margins.join('/') || 'none'}]`] = tally;

    for (const { p, v } of variants) {
      const variantId = v.id.split('/').pop() ?? v.id;
      const cost = collectiveVariantCost(v);
      const cur = Number(v.price);
      const curCmp = v.compareAtPrice ? Number(v.compareAtPrice) : null;
      let action: ResyncAction;
      let margin: number | null = null;
      let target: number | null = null;
      let targetCmp: number | null = null;
      if (!cost) action = 'no_cost';
      else if (!margins.length) action = 'no_margin';
      else if (priceMatchesCost(cur, cost, margins)) action = 'ok';
      else {
        margin = margins[0];
        target = retailFromCost(cost, margin);
        targetCmp = curCmp != null && target != null && curCmp > target ? curCmp : null;
        if (target == null) action = 'no_exact_retail';
        else if (await isMarketplaceVariantPriceLocked(variantId)) action = 'skip_locked';
        else if (options.holdLargeDrops && target < cur && (cur - target) / cur > LARGE_CHANGE_DROP) action = 'skip_large_drop';
        else action = 'update';
      }
      tally[action] = (tally[action] ?? 0) + 1;
      if (action === 'ok') continue;
      rows.push({
        action, vendor, handle: p.handle, status: p.status, variantId, variantTitle: v.title, cost, margin,
        currentPrice: cur, currentCompareAt: curCmp, targetPrice: target, targetCompareAt: targetCmp,
      });
    }
  }
  return { rows, summary };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Writes `update` rows to Shopify. Stops at `deadline` (epoch ms); the next run picks up the rest. */
export async function applyCollectivePriceResync(
  rows: ResyncRow[],
  options: { delayMs?: number; deadline?: number } = {}
): Promise<{ applied: number; failed: number; remaining: number; errors: string[] }> {
  const updates = rows.filter((r) => r.action === 'update' && r.targetPrice != null);
  let applied = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const r of updates) {
    if (options.deadline && Date.now() > options.deadline) break;
    try {
      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: r.variantId,
        price: (r.targetPrice as number).toFixed(2),
        compareAtPrice: r.targetCompareAt == null ? null : r.targetCompareAt.toFixed(2),
      });
      applied += 1;
    } catch (e) {
      failed += 1;
      errors.push(`${r.variantId}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(options.delayMs ?? 350);
  }
  return { applied, failed, remaining: updates.length - applied - failed, errors };
}
