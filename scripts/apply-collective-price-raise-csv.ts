#!/usr/bin/env tsx
/**
 * Bulk-raise Collective variants to inferred retail from an audit FIX-RAISE CSV.
 *
 * Re-reads live Shopify price before each write; skips if already within tol of target.
 * Dry-run by default. Pass --apply to write.
 *
 * Usage:
 *   npx tsx scripts/apply-collective-price-raise-csv.ts --csv=exports/collective-price-audit-ALL-FIX-RAISE-….csv
 *   npx tsx scripts/apply-collective-price-raise-csv.ts --csv=… --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import { getArg, hasFlag } from './lib/migration-cli';

type PlanRow = {
  vendor: string;
  handle: string;
  variantId: string;
  sku: string;
  csvPrice: number;
  targetPrice: number;
  collectiveCost: number | null;
};

function money(n: number): string {
  return n.toFixed(2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseCsv(path: string): PlanRow[] {
  const raw = fs.readFileSync(path, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0]!.split(',');
  const idx = (name: string) => header.indexOf(name);
  const iVendor = idx('vendor');
  const iHandle = idx('handle');
  const iVariant = idx('variant_id');
  const iSku = idx('sku');
  const iPrice = idx('shopify_price');
  const iTarget = idx('inferred_collective_retail');
  const iCost = idx('collective_cost');
  const iAction = idx('restore_action');

  const out: PlanRow[] = [];
  for (const line of lines.slice(1)) {
    // naive CSV split — audit CSV escapes quotes; handles rarely have commas in key fields
    // Use a simple state parser for quoted fields
    const cols: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else if (ch === '"') {
          inQ = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);

    if (iAction >= 0 && cols[iAction] && cols[iAction] !== 'raise_to_retail') continue;
    const variantId = cols[iVariant]?.trim();
    const target = Number(cols[iTarget]);
    const price = Number(cols[iPrice]);
    if (!variantId || !Number.isFinite(target) || target <= 0) continue;
    out.push({
      vendor: cols[iVendor] || '',
      handle: cols[iHandle] || '',
      variantId,
      sku: cols[iSku] || '',
      csvPrice: Number.isFinite(price) ? price : 0,
      targetPrice: Math.round(target * 100) / 100,
      collectiveCost: cols[iCost] ? Number(cols[iCost]) : null,
    });
  }
  return out;
}

async function fetchLivePrice(variantIdNumeric: string): Promise<number | null> {
  const data = await shopifyAdminFetch<{
    productVariant: { id: string; price: string } | null;
  }>({
    query: `query($id: ID!) {
      productVariant(id: $id) { id price }
    }`,
    variables: { id: `gid://shopify/ProductVariant/${variantIdNumeric}` },
  });
  const p = data.productVariant?.price;
  if (p == null) return null;
  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}

async function main(): Promise<void> {
  const csvArg = getArg('--csv');
  if (!csvArg) {
    // default to newest FIX-RAISE export
    const dir = resolve(process.cwd(), 'exports');
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('collective-price-audit-ALL-FIX-RAISE-') && f.endsWith('.csv'))
      .sort();
    if (!files.length) throw new Error('No FIX-RAISE CSV found; pass --csv=…');
    var csvPath = resolve(dir, files[files.length - 1]!);
  } else {
    var csvPath = resolve(process.cwd(), csvArg);
  }

  const apply = hasFlag('--apply');
  const tol = Number(getArg('--tol') || '0.50');
  const limitArg = getArg('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;

  let plan = parseCsv(csvPath);
  if (limit && Number.isFinite(limit)) plan = plan.slice(0, limit);

  console.log(`\nBulk Collective raise (${apply ? 'APPLY' : 'DRY-RUN'})`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Plan rows: ${plan.length}\n`);

  const byVendor = new Map<string, number>();
  for (const r of plan) byVendor.set(r.vendor, (byVendor.get(r.vendor) || 0) + 1);
  for (const [v, n] of [...byVendor.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${v}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to update Shopify.');
    return;
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = resolve(process.cwd(), `exports/collective-price-raise-apply-${stamp}.csv`);
  const logLines = [
    'vendor,handle,variant_id,sku,live_before,target,result,error',
  ];

  for (let i = 0; i < plan.length; i += 1) {
    const row = plan[i]!;
    try {
      const live = await fetchLivePrice(row.variantId);
      if (live == null) {
        fail += 1;
        logLines.push(
          `${csvEscape(row.vendor)},${csvEscape(row.handle)},${row.variantId},${csvEscape(row.sku)},,${money(row.targetPrice)},missing,variant not found`
        );
        continue;
      }
      if (live + tol >= row.targetPrice) {
        skip += 1;
        logLines.push(
          `${csvEscape(row.vendor)},${csvEscape(row.handle)},${row.variantId},${csvEscape(row.sku)},${money(live)},${money(row.targetPrice)},skipped,already_ok`
        );
        continue;
      }
      // Safety: never lower; never set below cost if known
      if (row.collectiveCost != null && row.targetPrice + 0.005 < row.collectiveCost) {
        fail += 1;
        logLines.push(
          `${csvEscape(row.vendor)},${csvEscape(row.handle)},${row.variantId},${csvEscape(row.sku)},${money(live)},${money(row.targetPrice)},blocked,target_below_cost`
        );
        continue;
      }

      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: row.variantId,
        price: money(row.targetPrice),
      });
      ok += 1;
      logLines.push(
        `${csvEscape(row.vendor)},${csvEscape(row.handle)},${row.variantId},${csvEscape(row.sku)},${money(live)},${money(row.targetPrice)},updated,`
      );
      if (ok % 25 === 0 || i === plan.length - 1) {
        console.log(`  updated ${ok} | skipped ${skip} | failed ${fail} | ${i + 1}/${plan.length}`);
      }
      await sleep(200);
    } catch (error) {
      fail += 1;
      const msg = error instanceof Error ? error.message.replace(/,/g, ';') : String(error);
      console.error(`  FAIL ${row.handle} ${row.variantId}: ${msg}`);
      logLines.push(
        `${csvEscape(row.vendor)},${csvEscape(row.handle)},${row.variantId},${csvEscape(row.sku)},,${money(row.targetPrice)},failed,${csvEscape(msg)}`
      );
      await sleep(500);
    }
  }

  fs.writeFileSync(logPath, logLines.join('\n') + '\n', 'utf-8');
  console.log(`\nDone. updated=${ok} skipped=${skip} failed=${fail}`);
  console.log(`Log: ${logPath}\n`);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
