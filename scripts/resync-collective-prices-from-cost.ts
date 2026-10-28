#!/usr/bin/env tsx
/**
 * Resync Shopify Collective variant prices to supplier retail (Collective cost ÷ vendor margin).
 * Same logic as the daily cron /api/cron/collective-price-sync.
 * Dry-run by default (CSV of mismatches). --apply writes price (+ clears compare-at at/below price).
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/resync-collective-prices-from-cost.ts \
 *     [--vendor="Little Equine Co."] [--primary-only="Exclusively Equine"] [--apply] [--hold-large-drops]
 */
import * as fs from 'fs';
import { getArg, hasFlag } from './lib/migration-cli';
import { applyCollectivePriceResync, planCollectivePriceResync } from '@/lib/collective/price-resync';

const money = (n: number | null) => (n == null ? '' : n.toFixed(2));
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main() {
  const apply = hasFlag('--apply');
  const primaryOnlyArg = getArg('--primary-only');
  const { rows, summary } = await planCollectivePriceResync({
    vendor: getArg('--vendor'),
    primaryOnly: primaryOnlyArg?.split(',').map((s) => s.trim()).filter(Boolean),
    holdLargeDrops: hasFlag('--hold-large-drops'),
  });

  const header = 'action,vendor,handle,status,variant_id,variant_title,cost,margin,current_price,current_compare_at,target_price,target_compare_at,price_diff';
  const lines = rows.map((r) =>
    [
      r.action, r.vendor, r.handle, r.status, r.variantId, r.variantTitle, money(r.cost || null),
      r.margin == null ? '' : r.margin.toFixed(2), money(r.currentPrice), money(r.currentCompareAt),
      money(r.targetPrice), money(r.targetCompareAt), r.targetPrice == null ? '' : (r.targetPrice - r.currentPrice).toFixed(2),
    ].map((c) => csvCell(String(c))).join(',')
  );
  const file = `exports/collective-cost-price-resync-${apply ? 'apply' : 'dry'}-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  fs.writeFileSync(file, `${[header, ...lines].join('\n')}\n`);
  const updates = rows.filter((r) => r.action === 'update').length;
  console.log(JSON.stringify(summary, null, 1));
  console.log(`CSV: ${file} | to update: ${updates} | mode: ${apply ? 'APPLY' : 'dry-run'}`);
  if (!apply) return;

  const result = await applyCollectivePriceResync(rows);
  for (const e of result.errors) console.error(`Failed ${e}`);
  console.log(`Applied ${result.applied}, failed ${result.failed}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
