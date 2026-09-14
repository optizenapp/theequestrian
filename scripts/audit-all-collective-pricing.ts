#!/usr/bin/env tsx
/**
 * ONE big audit: every Shopify Collective product vs Collective cost/retail.
 *
 * Scans all products tagged "shopify collective" (all vendors), compares
 * Shopify selling price to:
 *   - Collective cost (inventoryItem.unitCost — always synced)
 *   - Inferred Collective retail = cost / (1 - margin%)
 *
 * Margin: KNOWN_COLLECTIVE_MARGINS override, else auto-detect per vendor.
 *
 * Dry-run only — no writes. Produces one consolidated CSV for a bulk restore later.
 *
 * Usage:
 *   npx tsx scripts/audit-all-collective-pricing.ts
 *   npx tsx scripts/audit-all-collective-pricing.ts --status=active
 *   npx tsx scripts/audit-all-collective-pricing.ts --tol=0.50
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { COLLECTIVE_TAG, COLLECTIVE_VENDORS } from '@/lib/shipping/collective-vendors';
import { getArg } from './lib/migration-cli';
import {
  inferCollectiveRetail,
  KNOWN_COLLECTIVE_MARGINS,
  round2,
} from './lib/collective-retail';

type VariantNode = {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryItem: {
    unitCost: { amount: string; currencyCode: string } | null;
  } | null;
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

type Row = {
  severity: 'critical' | 'mismatch' | 'ok' | 'no_cost';
  productId: string;
  handle: string;
  title: string;
  vendor: string;
  status: string;
  variantId: string;
  variantTitle: string;
  sku: string;
  shopifyPrice: number;
  collectiveCost: number | null;
  inferredRetail: number | null;
  compareAt: number | null;
  deltaVsRetail: number | null;
  marginPctActual: number | null;
  marginPctExpected: number;
  flags: string;
  restoreAction: string;
};

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function cents(n: number): number {
  return Math.round(n * 100) % 100;
}

function looksLikeRetail(n: number): boolean {
  const c = cents(n);
  return c === 0 || c === 50 || c === 90 || c === 95 || c === 99;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function modeRounded(nums: number[], decimals = 0): number | null {
  if (!nums.length) return null;
  const counts = new Map<number, number>();
  for (const n of nums) {
    const key = Number(n.toFixed(decimals));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [k, v] of counts) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best;
}

function detectMarginPct(
  samples: Array<{ price: number; cost: number; marginPct: number }>
): number {
  const healthy = samples.filter(
    (s) =>
      s.price > s.cost * 1.02 &&
      s.marginPct >= 3 &&
      s.marginPct <= 40 &&
      looksLikeRetail(s.price)
  );
  const pool =
    healthy.length >= 15 ? healthy : samples.filter((s) => s.price > s.cost * 1.02);
  const margins = pool.map((s) => s.marginPct);
  const mode = modeRounded(margins, 0);
  if (mode != null && mode >= 3 && mode <= 40) return mode;
  const med = median(margins);
  if (med != null && med >= 3 && med <= 40) return round2(med);
  return 10;
}

async function fetchAllVariantsForProduct(
  productId: string,
  firstPage: ProductNode['variants']
): Promise<VariantNode[]> {
  const out: VariantNode[] = firstPage.edges.map((e) => e.node);
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
                inventoryItem { unitCost { amount currencyCode } }
              }
            }
          }
        }
      }`,
      variables: { id: productId, after: cursor },
    });
    const page = data.product?.variants;
    if (!page) break;
    for (const { node } of page.edges) out.push(node);
    hasNext = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    await sleep(100);
  }
  return out;
}

/** All Collective-tagged products (+ any COLLECTIVE_VENDORS missed by tag). */
async function fetchAllCollectiveProducts(statusFilter?: string): Promise<ProductNode[]> {
  const byId = new Map<string, ProductNode>();

  async function fetchQuery(query: string, label: string): Promise<void> {
    let cursor: string | null = null;
    let hasNext = true;
    let n = 0;
    while (hasNext) {
      const data = await shopifyAdminFetch<{
        products: {
          edges: Array<{ node: ProductNode }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>({
        query: `query($first: Int!, $after: String, $query: String!) {
          products(first: $first, after: $after, query: $query) {
            edges {
              node {
                id handle title vendor status tags
                variants(first: 100) {
                  pageInfo { hasNextPage endCursor }
                  edges {
                    node {
                      id title sku price compareAtPrice
                      inventoryItem { unitCost { amount currencyCode } }
                    }
                  }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { first: 50, after: cursor, query },
      });

      for (const { node } of data.products.edges) {
        if (byId.has(node.id)) continue;
        if (node.variants.pageInfo.hasNextPage) {
          const variants = await fetchAllVariantsForProduct(node.id, node.variants);
          byId.set(node.id, {
            ...node,
            variants: {
              pageInfo: { hasNextPage: false, endCursor: null },
              edges: variants.map((v) => ({ node: v })),
            },
          });
        } else {
          byId.set(node.id, node);
        }
        n += 1;
      }
      hasNext = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
      if (n > 0 && n % 250 < 50) console.log(`  [${label}] products=${byId.size}…`);
      await sleep(150);
    }
    console.log(`  [${label}] done — unique products so far ${byId.size}`);
  }

  const statusPart = statusFilter ? ` status:${statusFilter}` : '';
  console.log('Fetching tag:"shopify collective"…');
  await fetchQuery(`tag:"${COLLECTIVE_TAG}"${statusPart}`, 'tag');

  for (const vendor of COLLECTIVE_VENDORS) {
    console.log(`Fetching vendor:"${vendor}" (catch stragglers)…`);
    await fetchQuery(`vendor:"${vendor}"${statusPart}`, vendor);
  }

  return [...byId.values()];
}

async function main(): Promise<void> {
  const statusFilter = (getArg('--status') || 'active').toLowerCase();
  const mismatchTol = Number(getArg('--tol') || '0.50');
  const statusArg = statusFilter === 'all' ? undefined : statusFilter;

  console.log('\n========== ALL COLLECTIVE VENDOR PRICE AUDIT (DRY-RUN) ==========');
  console.log(`Status: ${statusArg || 'all'}  |  mismatch tol: ±$${mismatchTol.toFixed(2)}\n`);

  const products = await fetchAllCollectiveProducts(statusArg);
  console.log(`\nTotal Collective products: ${products.length}`);

  type Raw = {
    product: ProductNode;
    variant: VariantNode;
    price: number;
    cost: number | null;
    compareAt: number | null;
  };
  const raws: Raw[] = [];
  const samplesByVendor = new Map<
    string,
    Array<{ price: number; cost: number; marginPct: number }>
  >();

  for (const product of products) {
    for (const { node: variant } of product.variants.edges) {
      const price = Number(variant.price);
      if (!Number.isFinite(price)) continue;
      const costRaw = variant.inventoryItem?.unitCost?.amount;
      const cost =
        costRaw != null && Number.isFinite(Number(costRaw)) ? Number(costRaw) : null;
      const compareAtRaw = variant.compareAtPrice ? Number(variant.compareAtPrice) : null;
      const compareAt =
        compareAtRaw != null && Number.isFinite(compareAtRaw) ? compareAtRaw : null;
      raws.push({ product, variant, price, cost, compareAt });
      if (cost != null && cost > 0 && price > 0) {
        const marginPct = ((price - cost) / price) * 100;
        const list = samplesByVendor.get(product.vendor) || [];
        list.push({ price, cost, marginPct });
        samplesByVendor.set(product.vendor, list);
      }
    }
  }

  const marginByVendor = new Map<string, number>();
  for (const [vendor, samples] of samplesByVendor) {
    const known = KNOWN_COLLECTIVE_MARGINS[vendor.toLowerCase()];
    marginByVendor.set(vendor, known != null ? known : detectMarginPct(samples));
  }
  // Ensure known vendors without samples still listed
  for (const v of COLLECTIVE_VENDORS) {
    if (!marginByVendor.has(v)) marginByVendor.set(v, KNOWN_COLLECTIVE_MARGINS[v.toLowerCase()] ?? 10);
  }

  console.log('\nDetected / known margins:');
  for (const [vendor, m] of [...marginByVendor.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const known = KNOWN_COLLECTIVE_MARGINS[vendor.toLowerCase()] != null ? 'known' : 'auto';
    const n = samplesByVendor.get(vendor)?.length || 0;
    console.log(`  ${m.toString().padStart(5)}%  (${known})  ${String(n).padStart(5)} variants  ${vendor}`);
  }

  const rows: Row[] = [];
  const counts = { critical: 0, mismatch: 0, ok: 0, no_cost: 0 };

  for (const r of raws) {
    const flags: string[] = [];
    let severity: Row['severity'] = 'ok';
    let inferredRetail: number | null = null;
    let delta: number | null = null;
    let marginActual: number | null = null;
    const expectedMargin = marginByVendor.get(r.product.vendor) ?? 10;
    let restoreAction = '';

    if (r.cost == null || r.cost <= 0) {
      severity = 'no_cost';
      flags.push('missing_collective_cost');
      counts.no_cost += 1;
    } else {
      inferredRetail = inferCollectiveRetail(r.cost, expectedMargin);
      delta = round2(r.price - inferredRetail);
      marginActual = round2(((r.price - r.cost) / r.price) * 100);

      if (r.price + 0.005 < r.cost) {
        severity = 'critical';
        flags.push('below_collective_cost');
        counts.critical += 1;
        restoreAction = 'raise_to_retail';
      } else if (delta < -mismatchTol) {
        severity = 'mismatch';
        flags.push('under_collective_retail');
        counts.mismatch += 1;
        restoreAction = 'raise_to_retail';
      } else if (delta > mismatchTol) {
        severity = 'mismatch';
        flags.push('over_collective_retail');
        counts.mismatch += 1;
        restoreAction = 'review_overpriced';
      } else {
        counts.ok += 1;
      }

      if (r.price <= 1.005 && r.cost > 5) flags.push('one_dollar_smash');
      if (
        inferredRetail != null &&
        (Math.abs(r.price + 12.95 - inferredRetail) < 0.08 ||
          Math.abs(r.price + 12 - inferredRetail) < 0.08 ||
          Math.abs(r.price + 18.5 - inferredRetail) < 0.08 ||
          Math.abs(r.price + 8 - inferredRetail) < 0.08 ||
          Math.abs(r.price + 20 - inferredRetail) < 0.08)
      ) {
        flags.push('looks_like_offset_double_subtract');
      }
    }

    rows.push({
      severity,
      productId: gidNumeric(r.product.id),
      handle: r.product.handle,
      title: r.product.title,
      vendor: r.product.vendor,
      status: r.product.status,
      variantId: gidNumeric(r.variant.id),
      variantTitle: r.variant.title,
      sku: r.variant.sku || '',
      shopifyPrice: round2(r.price),
      collectiveCost: r.cost != null ? round2(r.cost) : null,
      inferredRetail,
      compareAt: r.compareAt != null ? round2(r.compareAt) : null,
      deltaVsRetail: delta,
      marginPctActual: marginActual,
      marginPctExpected: expectedMargin,
      flags: flags.join('|'),
      restoreAction,
    });
  }

  const rank = { critical: 0, mismatch: 1, no_cost: 2, ok: 3 };
  rows.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      a.vendor.localeCompare(b.vendor) ||
      (a.deltaVsRetail || 0) - (b.deltaVsRetail || 0)
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullPath = resolve(process.cwd(), `exports/collective-price-audit-ALL-${stamp}.csv`);
  const fixPath = resolve(
    process.cwd(),
    `exports/collective-price-audit-ALL-FIX-RAISE-${stamp}.csv`
  );
  const summaryPath = resolve(
    process.cwd(),
    `exports/collective-price-audit-ALL-summary-${stamp}.json`
  );

  const header = [
    'severity',
    'restore_action',
    'status',
    'vendor',
    'product_id',
    'handle',
    'title',
    'variant_id',
    'variant_title',
    'sku',
    'shopify_price',
    'collective_cost',
    'inferred_collective_retail',
    'delta_vs_retail',
    'compare_at',
    'margin_pct_actual',
    'margin_pct_expected',
    'flags',
  ].join(',');

  const toLine = (row: Row) =>
    [
      row.severity,
      row.restoreAction,
      row.status,
      csvEscape(row.vendor),
      row.productId,
      csvEscape(row.handle),
      csvEscape(row.title),
      row.variantId,
      csvEscape(row.variantTitle),
      csvEscape(row.sku),
      row.shopifyPrice.toFixed(2),
      row.collectiveCost != null ? row.collectiveCost.toFixed(2) : '',
      row.inferredRetail != null ? row.inferredRetail.toFixed(2) : '',
      row.deltaVsRetail != null ? row.deltaVsRetail.toFixed(2) : '',
      row.compareAt != null ? row.compareAt.toFixed(2) : '',
      row.marginPctActual != null ? row.marginPctActual.toFixed(2) : '',
      row.marginPctExpected.toFixed(2),
      row.flags,
    ].join(',');

  fs.writeFileSync(fullPath, [header, ...rows.map(toLine)].join('\n') + '\n', 'utf-8');

  const toRaise = rows.filter((r) => r.restoreAction === 'raise_to_retail');
  fs.writeFileSync(fixPath, [header, ...toRaise.map(toLine)].join('\n') + '\n', 'utf-8');

  const byVendor: Record<
    string,
    {
      variants: number;
      ok: number;
      critical: number;
      mismatch: number;
      no_cost: number;
      raise: number;
      underSum: number;
      marginPct: number;
    }
  > = {};

  for (const r of rows) {
    const bucket = byVendor[r.vendor] || {
      variants: 0,
      ok: 0,
      critical: 0,
      mismatch: 0,
      no_cost: 0,
      raise: 0,
      underSum: 0,
      marginPct: r.marginPctExpected,
    };
    bucket.variants += 1;
    bucket[r.severity] += 1;
    if (r.restoreAction === 'raise_to_retail') {
      bucket.raise += 1;
      bucket.underSum += Math.abs(r.deltaVsRetail || 0);
    }
    byVendor[r.vendor] = bucket;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    statusFilter: statusArg || 'all',
    mismatchTol,
    products: products.length,
    variants: rows.length,
    counts,
    toRaise: toRaise.length,
    underSumIfOneEach: round2(toRaise.reduce((s, r) => s + Math.abs(r.deltaVsRetail || 0), 0)),
    byVendor,
    files: { full: fullPath, fixRaise: fixPath },
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf-8');

  console.log('\n========== SUMMARY ==========');
  console.log(`Products:            ${products.length}`);
  console.log(`Variants:            ${rows.length}`);
  console.log(`OK:                  ${counts.ok}`);
  console.log(`Mismatch:            ${counts.mismatch}`);
  console.log(`Critical (< cost):   ${counts.critical}`);
  console.log(`Missing cost:        ${counts.no_cost}`);
  console.log(`TO RAISE (fix set):  ${toRaise.length}`);
  console.log(`Σ undercharge (1ea): $${summary.underSumIfOneEach.toFixed(2)}`);

  console.log('\nBy vendor (raise / critical / mismatch / ok / variants):');
  for (const [vendor, s] of Object.entries(byVendor).sort((a, b) => b[1].raise - a[1].raise)) {
    console.log(
      `  raise=${String(s.raise).padStart(5)}  crit=${String(s.critical).padStart(5)}  mis=${String(s.mismatch).padStart(5)}  ok=${String(s.ok).padStart(5)}  n=${String(s.variants).padStart(5)}  margin=${s.marginPct}%  ${vendor}`
    );
  }

  console.log(`\nWrote full:     ${fullPath}`);
  console.log(`Wrote fix set:  ${fixPath}`);
  console.log(`Wrote summary:  ${summaryPath}`);
  console.log('(dry-run — no Shopify writes)\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
