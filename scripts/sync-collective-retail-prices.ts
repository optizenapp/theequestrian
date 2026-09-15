#!/usr/bin/env tsx
/**
 * Sync Shopify Collective selling prices to Collective supplier retail.
 *
 * Does NOT use margin inference or shipping-offset math.
 * Targets come only from Sep-1 offset-disable CSVs (resolved Collective retail).
 *
 * Usage:
 *   npx tsx scripts/sync-collective-retail-prices.ts
 *   npx tsx scripts/sync-collective-retail-prices.ts --apply
 *   npx tsx scripts/sync-collective-retail-prices.ts --status=active
 *   npx tsx scripts/sync-collective-retail-prices.ts --tol=0.05
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import { COLLECTIVE_TAG } from '@/lib/shipping/collective-vendors';
import { getArg, hasFlag } from './lib/migration-cli';

type VariantNode = {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryItem: { unitCost: { amount: string } | null } | null;
};

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  status: string;
  tags: string[];
  variants: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{ node: VariantNode }>;
  };
};

type CsvRetail = {
  retail: number;
  source: string;
  current: number;
  target: number;
  offset: number;
  handle: string;
  vendor: string;
};

type PlanRow = {
  vendor: string;
  handle: string;
  title: string;
  status: string;
  variantId: string;
  variantIdNumeric: string;
  sku: string;
  livePrice: number;
  targetRetail: number;
  delta: number;
  unitCost: number | null;
  resolveSource: string;
  action: 'raise' | 'lower' | 'ok' | 'no_target';
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cents(n: number): number {
  return Math.round(n * 100) % 100;
}

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * From a Sep-1 subtract row, pick Collective retail (no margin).
 * - current=.95 and target=.00 (shipping stripped from already-correct retail) → current
 * - target=.95/.90 (correct un-bake of shipping) → target
 */
function resolveCsvRetail(
  current: number,
  target: number,
  offset: number
): { retail: number; source: string } | null {
  if (!(current > 0) || !(target > 0)) return null;
  if (Math.abs(current - target - offset) > 0.06 && offset > 0) {
    // Still usable if current > target (prefer current when .95 smash pattern)
    if (cents(current) === 95 && target + 0.5 < current) {
      return { retail: round2(current), source: 'csv_current_despite_offset_mismatch' };
    }
    return null;
  }
  const cc = cents(current);
  const tc = cents(target);
  if (cc === 95 && tc === 0) {
    return { retail: round2(current), source: 'csv_restore_bad_subtract_.95_to_.00' };
  }
  if (cc === 95 && tc !== 95 && tc !== 90 && current > target + 0.5) {
    return { retail: round2(current), source: 'csv_restore_bad_subtract_from_.95' };
  }
  if (tc === 95 || tc === 90) {
    return { retail: round2(target), source: 'csv_keep_unbaked_.95' };
  }
  if (cc === 95) {
    return { retail: round2(current), source: 'csv_prefer_current_.95' };
  }
  // Default: post-subtract (shipping out of price is the Collective model)
  return { retail: round2(target), source: 'csv_default_post_subtract' };
}

function loadCsvRetails(): Map<string, CsvRetail> {
  const dir = resolve(process.cwd(), 'exports');
  const map = new Map<string, CsvRetail>();
  if (!fs.existsSync(dir)) return map;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('collective-offset-disable-2026-09-01') && f.endsWith('.csv'))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(resolve(dir, file), 'utf-8');
    const rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>;

    for (const row of rows) {
      if ((row.source || '').trim() !== 'subtract') continue;
      const variantId = (row.variant_id || '').trim();
      const current = Number(row.current_price);
      const target = Number(row.target_price);
      const offset = Number(row.offset_removed || 0);
      if (!variantId || !Number.isFinite(current) || !Number.isFinite(target)) continue;
      if (current <= target + 0.01) continue;

      const resolved = resolveCsvRetail(current, target, offset);
      if (!resolved) continue;

      const prev = map.get(variantId);
      // Prefer the highest resolved retail seen (pre-smash Collective retail wins over later smashes)
      if (!prev || resolved.retail > prev.retail + 0.001) {
        map.set(variantId, {
          retail: resolved.retail,
          source: `${resolved.source}|${file}`,
          current,
          target,
          offset,
          handle: row.handle || '',
          vendor: row.vendor || '',
        });
      }
    }
  }

  console.log(`CSV retail map: ${map.size} variants from ${files.length} Sep-1 files`);
  return map;
}

async function fetchAllVariants(
  productId: string,
  firstPage: ProductNode['variants']
): Promise<VariantNode[]> {
  const out = firstPage.edges.map((e) => e.node);
  let hasNext = firstPage.pageInfo.hasNextPage;
  let cursor = firstPage.pageInfo.endCursor;
  while (hasNext) {
    const data = await shopifyAdminFetch<{
      product: {
        variants: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: VariantNode }>;
        };
      } | null;
    }>({
      query: `query($id: ID!, $after: String) {
        product(id: $id) {
          variants(first: 100, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id title sku price compareAtPrice
                inventoryItem { unitCost { amount } }
              }
            }
          }
        }
      }`,
      variables: { id: productId, after: cursor },
    });
    const page = data.product?.variants;
    if (!page) break;
    for (const e of page.edges) out.push(e.node);
    hasNext = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    await sleep(50);
  }
  return out;
}

function resolveLiveTarget(input: {
  live: number;
  vendor: string;
  unitCost: number | null;
  csv: CsvRetail | undefined;
}): { retail: number; source: string } | null {
  // CSV only — never reconstruct via live + shipping offset (that re-bakes freight).
  if (input.csv) {
    return { retail: input.csv.retail, source: input.csv.source };
  }
  return null;
}

async function main(): Promise<void> {
  const apply = hasFlag('--apply');
  const tol = Number(getArg('--tol') || '0.05');
  const statusFilter = (getArg('--status') || 'active').toLowerCase();
  const limitProducts = Number(getArg('--limit-products') || '0');

  console.log(`\nCollective retail sync — ${apply ? 'APPLY' : 'AUDIT (dry-run)'}`);
  console.log(`status=${statusFilter} tol=$${tol}\n`);

  const csvMap = loadCsvRetails();
  const plan: PlanRow[] = [];

  let cursor: string | null = null;
  let hasNext = true;
  let products = 0;
  const queryParts = [`tag:"${COLLECTIVE_TAG}"`];
  if (statusFilter === 'active') queryParts.push('status:active');
  else if (statusFilter === 'draft') queryParts.push('status:draft');
  const search = queryParts.join(' ');

  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: ProductNode }>;
      };
    }>({
      query: `query($first: Int!, $after: String, $query: String!) {
        products(first: $first, after: $after, query: $query) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id handle title vendor status tags
              variants(first: 50) {
                pageInfo { hasNextPage endCursor }
                edges {
                  node {
                    id title sku price compareAtPrice
                    inventoryItem { unitCost { amount } }
                  }
                }
              }
            }
          }
        }
      }`,
      variables: { first: 25, after: cursor, query: search },
    });

    for (const { node: product } of data.products.edges) {
      products += 1;
      if (limitProducts > 0 && products > limitProducts) {
        hasNext = false;
        break;
      }

      const variants = product.variants.pageInfo.hasNextPage
        ? await fetchAllVariants(product.id, product.variants)
        : product.variants.edges.map((e) => e.node);

      for (const variant of variants) {
        const live = Number(variant.price);
        if (!Number.isFinite(live)) continue;
        const vidNum = gidNumeric(variant.id);
        const csv = csvMap.get(vidNum);
        const costRaw = variant.inventoryItem?.unitCost?.amount;
        const unitCost = costRaw != null ? Number(costRaw) : null;
        const resolved = resolveLiveTarget({
          live,
          vendor: product.vendor,
          unitCost: unitCost != null && Number.isFinite(unitCost) ? unitCost : null,
          csv,
        });

        if (!resolved) {
          plan.push({
            vendor: product.vendor,
            handle: product.handle,
            title: product.title,
            status: product.status,
            variantId: variant.id,
            variantIdNumeric: vidNum,
            sku: variant.sku || '',
            livePrice: round2(live),
            targetRetail: round2(live),
            delta: 0,
            unitCost: unitCost != null && Number.isFinite(unitCost) ? round2(unitCost) : null,
            resolveSource: 'none',
            action: 'no_target',
          });
          continue;
        }

        const delta = round2(resolved.retail - live);
        let action: PlanRow['action'] = 'ok';
        if (Math.abs(delta) > tol) {
          action = delta > 0 ? 'raise' : 'lower';
        }

        plan.push({
          vendor: product.vendor,
          handle: product.handle,
          title: product.title,
          status: product.status,
          variantId: variant.id,
          variantIdNumeric: vidNum,
          sku: variant.sku || '',
          livePrice: round2(live),
          targetRetail: resolved.retail,
          delta,
          unitCost: unitCost != null && Number.isFinite(unitCost) ? round2(unitCost) : null,
          resolveSource: resolved.source,
          action,
        });
      }
    }

    if (limitProducts > 0 && products >= limitProducts) break;
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
    if (products % 100 === 0) console.log(`  scanned products=${products} plan=${plan.length}`);
    await sleep(80);
  }

  const raise = plan.filter((r) => r.action === 'raise');
  const lower = plan.filter((r) => r.action === 'lower');
  const ok = plan.filter((r) => r.action === 'ok');
  const noTarget = plan.filter((r) => r.action === 'no_target');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const beforePath = resolve(process.cwd(), `exports/collective-retail-sync-BEFORE-${stamp}.csv`);
  const mismatchPath = resolve(
    process.cwd(),
    `exports/collective-retail-sync-MISMATCHES-${stamp}.csv`
  );

  const cols = [
    'action',
    'vendor',
    'handle',
    'title',
    'status',
    'variant_id',
    'sku',
    'live_price',
    'target_retail',
    'delta',
    'unit_cost',
    'resolve_source',
  ];
  const toCsv = (rows: PlanRow[]) =>
    stringify(
      rows.map((r) => [
        r.action,
        r.vendor,
        r.handle,
        r.title,
        r.status,
        r.variantIdNumeric,
        r.sku,
        r.livePrice.toFixed(2),
        r.targetRetail.toFixed(2),
        r.delta.toFixed(2),
        r.unitCost != null ? r.unitCost.toFixed(2) : '',
        r.resolveSource,
      ]),
      { header: true, columns: cols }
    );

  fs.writeFileSync(beforePath, toCsv(plan));
  fs.writeFileSync(mismatchPath, toCsv([...raise, ...lower]));

  const byVendor = new Map<string, { raise: number; lower: number; ok: number; lift: number }>();
  for (const r of plan) {
    const v = byVendor.get(r.vendor) || { raise: 0, lower: 0, ok: 0, lift: 0 };
    if (r.action === 'raise') {
      v.raise += 1;
      v.lift += r.delta;
    } else if (r.action === 'lower') v.lower += 1;
    else if (r.action === 'ok') v.ok += 1;
    byVendor.set(r.vendor, v);
  }

  console.log(`\n=== BEFORE AUDIT ===`);
  console.log(`Products scanned: ${products}`);
  console.log(`Variants:         ${plan.length}`);
  console.log(`OK (matched):     ${ok.length}`);
  console.log(`RAISE:            ${raise.length}`);
  console.log(`LOWER:            ${lower.length}`);
  console.log(`No target:        ${noTarget.length}`);
  console.log(
    `$ lift if raise 1ea: $${raise.reduce((s, r) => s + r.delta, 0).toFixed(2)}`
  );
  console.log(`\nBy vendor (raise/lower/ok):`);
  for (const [vendor, v] of [...byVendor.entries()].sort((a, b) => b[1].raise - a[1].raise)) {
    if (v.raise + v.lower === 0) continue;
    console.log(
      `  ${vendor.padEnd(42)} raise=${String(v.raise).padStart(4)} lower=${String(v.lower).padStart(4)} ok=${v.ok}  lift~$${v.lift.toFixed(0)}`
    );
  }

  const noble = plan.filter((r) => r.handle.includes('noble-balance-riding-tight'));
  console.log(`\nNoble Balance sample:`);
  for (const r of noble.slice(0, 8)) {
    console.log(
      `  ${r.action.padEnd(6)} $${r.livePrice.toFixed(2)} → $${r.targetRetail.toFixed(2)}  ${r.handle} ${r.sku}`
    );
  }

  console.log(`\nWrote ${beforePath}`);
  console.log(`Wrote ${mismatchPath}`);

  if (!apply) {
    console.log(`\nDry-run only. Re-run with --apply to write Shopify prices.`);
    return;
  }

  const toWrite = [...raise, ...lower];
  console.log(`\nApplying ${toWrite.length} price updates…`);
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const applyRows: Array<Record<string, string>> = [];

  for (const row of toWrite) {
    try {
      // Re-read live price
      const liveData = await shopifyAdminFetch<{
        productVariant: { id: string; price: string } | null;
      }>({
        query: `query($id: ID!) {
          productVariant(id: $id) { id price }
        }`,
        variables: { id: row.variantId },
      });
      const liveNow = Number(liveData.productVariant?.price || row.livePrice);
      if (Math.abs(liveNow - row.targetRetail) <= tol) {
        skipped += 1;
        applyRows.push({
          vendor: row.vendor,
          handle: row.handle,
          variant_id: row.variantIdNumeric,
          sku: row.sku,
          live_before: liveNow.toFixed(2),
          target: row.targetRetail.toFixed(2),
          result: 'skipped_already_matched',
          error: '',
        });
        continue;
      }

      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: row.variantIdNumeric,
        price: row.targetRetail.toFixed(2),
      });
      updated += 1;
      applyRows.push({
        vendor: row.vendor,
        handle: row.handle,
        variant_id: row.variantIdNumeric,
        sku: row.sku,
        live_before: liveNow.toFixed(2),
        target: row.targetRetail.toFixed(2),
        result: 'updated',
        error: '',
      });
    } catch (e) {
      failed += 1;
      applyRows.push({
        vendor: row.vendor,
        handle: row.handle,
        variant_id: row.variantIdNumeric,
        sku: row.sku,
        live_before: row.livePrice.toFixed(2),
        target: row.targetRetail.toFixed(2),
        result: 'failed',
        error: (e as Error).message.slice(0, 200),
      });
    }

    if ((updated + skipped + failed) % 25 === 0) {
      console.log(
        `  updated ${updated} | skipped ${skipped} | failed ${failed} | ${updated + skipped + failed}/${toWrite.length}`
      );
    }
    await sleep(120);
  }

  const applyPath = resolve(process.cwd(), `exports/collective-retail-sync-APPLY-${stamp}.csv`);
  fs.writeFileSync(
    applyPath,
    stringify(applyRows, {
      header: true,
      columns: [
        'vendor',
        'handle',
        'variant_id',
        'sku',
        'live_before',
        'target',
        'result',
        'error',
      ],
    })
  );

  console.log(`\n=== APPLY DONE ===`);
  console.log(`updated=${updated} skipped=${skipped} failed=${failed}`);
  console.log(`Wrote ${applyPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
