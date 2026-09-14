#!/usr/bin/env tsx
/**
 * Audit Shopify selling prices vs Shopify Collective pricing for a vendor.
 *
 * Collective source of truth available via Admin API:
 *   - Cost (always synced): inventoryItem.unitCost
 *   - Retail: NOT a separate API field — inferred as cost / (1 - margin%)
 *     Margin auto-detected from healthy variants, or pass --margin=10
 *
 * Flags mismatches where Shopify price ≠ inferred Collective retail,
 * or where price < cost (you lose money on Collective debit).
 *
 * Dry-run only — no writes.
 *
 * Usage:
 *   npx tsx scripts/audit-collective-vendor-pricing.ts --vendor="Toptac International"
 *   npx tsx scripts/audit-collective-vendor-pricing.ts --vendor="Toptac International" --margin=10
 *   npx tsx scripts/audit-collective-vendor-pricing.ts --vendor="JnK Collective" --status=active
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getArg } from './lib/migration-cli';

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
};

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to nearest 0.05 (common AUD Collective retail endings). */
function roundRetail(n: number): number {
  return Math.round(n * 20) / 20;
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

function modeRounded(nums: number[], decimals = 1): number | null {
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
    await sleep(120);
  }
  return out;
}

async function fetchVendorProducts(vendor: string, statusFilter?: string): Promise<ProductNode[]> {
  const out: ProductNode[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  const qParts = [`vendor:"${vendor}"`];
  if (statusFilter) qParts.push(`status:${statusFilter}`);
  const query = qParts.join(' ');

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
      if (node.variants.pageInfo.hasNextPage) {
        const variants = await fetchAllVariantsForProduct(node.id, node.variants);
        out.push({
          ...node,
          variants: {
            pageInfo: { hasNextPage: false, endCursor: null },
            edges: variants.map((v) => ({ node: v })),
          },
        });
      } else {
        out.push(node);
      }
    }

    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
    if (out.length % 200 < 50) {
      console.log(`  fetched products=${out.length}…`);
    }
    await sleep(150);
  }
  return out;
}

type Sample = { price: number; cost: number; marginPct: number };

function detectMarginPct(samples: Sample[]): number {
  // Prefer variants that look like healthy retail (not smashed)
  const healthy = samples.filter(
    (s) =>
      s.price > s.cost * 1.02 &&
      s.marginPct >= 3 &&
      s.marginPct <= 40 &&
      looksLikeRetail(s.price)
  );
  const pool = healthy.length >= 20 ? healthy : samples.filter((s) => s.price > s.cost * 1.02);
  const margins = pool.map((s) => s.marginPct);
  const mode = modeRounded(margins, 0);
  if (mode != null && mode >= 3 && mode <= 40) return mode;
  const med = median(margins);
  if (med != null && med >= 3 && med <= 40) return round2(med);
  return 10; // Collective default-ish fallback
}

function inferRetailFromCost(cost: number, marginPct: number): number {
  if (marginPct >= 100 || marginPct <= 0) return roundRetail(cost);
  const raw = cost / (1 - marginPct / 100);
  // Prefer .95/.90 endings when close
  const r = roundRetail(raw);
  const as95 = Math.floor(raw) + 0.95;
  const as90 = Math.floor(raw) + 0.9;
  const as00 = Math.round(raw);
  const candidates = [r, as95, as90, as00, round2(raw)];
  let best = candidates[0]!;
  let bestDiff = Math.abs(best - raw);
  for (const c of candidates) {
    const d = Math.abs(c - raw);
    if (d < bestDiff - 0.001 || (Math.abs(d - bestDiff) < 0.001 && looksLikeRetail(c) && !looksLikeRetail(best))) {
      best = c;
      bestDiff = d;
    }
  }
  return round2(best);
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor') || 'Toptac International';
  const statusFilter = (getArg('--status') || '').toLowerCase() || undefined;
  const marginArg = getArg('--margin');
  const mismatchTol = Number(getArg('--tol') || '0.50'); // AUD tolerance vs inferred retail

  console.log(`\nCollective pricing audit (DRY-RUN) — vendor="${vendor}"`);
  if (statusFilter) console.log(`Status filter: ${statusFilter}`);
  console.log(`Mismatch tolerance: ±$${mismatchTol.toFixed(2)}\n`);

  const products = await fetchVendorProducts(vendor, statusFilter);
  console.log(`Products: ${products.length}`);

  const samples: Sample[] = [];
  type Raw = {
    product: ProductNode;
    variant: VariantNode;
    price: number;
    cost: number | null;
    compareAt: number | null;
  };
  const raws: Raw[] = [];

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
        samples.push({ price, cost, marginPct });
      }
    }
  }

  const expectedMargin =
    marginArg != null && Number.isFinite(Number(marginArg))
      ? Number(marginArg)
      : detectMarginPct(samples);

  console.log(
    `Expected Collective retailer margin: ${expectedMargin}%` +
      (marginArg ? ' (from --margin)' : ' (auto-detected)')
  );
  console.log(`Variants: ${raws.length}\n`);

  const rows: Row[] = [];
  const counts = {
    critical: 0,
    mismatch: 0,
    ok: 0,
    no_cost: 0,
  };

  for (const r of raws) {
    const flags: string[] = [];
    let severity: Row['severity'] = 'ok';
    let inferredRetail: number | null = null;
    let delta: number | null = null;
    let marginActual: number | null = null;

    if (r.cost == null || r.cost <= 0) {
      severity = 'no_cost';
      flags.push('missing_collective_cost');
      counts.no_cost += 1;
    } else {
      inferredRetail = inferRetailFromCost(r.cost, expectedMargin);
      delta = round2(r.price - inferredRetail);
      marginActual = round2(((r.price - r.cost) / r.price) * 100);

      if (r.price + 0.005 < r.cost) {
        severity = 'critical';
        flags.push('below_collective_cost');
        counts.critical += 1;
      } else if (Math.abs(delta) > mismatchTol) {
        severity = 'mismatch';
        flags.push(delta < 0 ? 'under_collective_retail' : 'over_collective_retail');
        counts.mismatch += 1;
      } else {
        counts.ok += 1;
      }

      // Extra smash signals
      if (r.price <= 1.005 && r.cost > 5) flags.push('one_dollar_smash');
      if (
        Math.abs(r.price + 12.95 - inferredRetail) < 0.06 ||
        Math.abs(r.price + 12 - inferredRetail) < 0.06
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
    });
  }

  // Sort worst first
  const rank = { critical: 0, mismatch: 1, no_cost: 2, ok: 3 };
  rows.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.deltaVsRetail || 0) - (b.deltaVsRetail || 0));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outPath = resolve(process.cwd(), `exports/collective-price-audit-${slug}-${stamp}.csv`);
  const badPath = resolve(
    process.cwd(),
    `exports/collective-price-audit-${slug}-MISMATCHES-${stamp}.csv`
  );

  const header = [
    'severity',
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

  fs.writeFileSync(outPath, [header, ...rows.map(toLine)].join('\n') + '\n', 'utf-8');
  const bad = rows.filter((r) => r.severity === 'critical' || r.severity === 'mismatch');
  fs.writeFileSync(badPath, [header, ...bad.map(toLine)].join('\n') + '\n', 'utf-8');

  const under = bad.filter((r) => (r.deltaVsRetail || 0) < 0);
  const underSum = under.reduce((s, r) => s + Math.abs(r.deltaVsRetail || 0), 0);
  const activeCritical = rows.filter((r) => r.severity === 'critical' && r.status === 'ACTIVE');
  const activeMismatch = rows.filter((r) => r.severity === 'mismatch' && r.status === 'ACTIVE');

  console.log('========== SUMMARY ==========');
  console.log(`Vendor:              ${vendor}`);
  console.log(`Expected margin:     ${expectedMargin}%`);
  console.log(`Variants scanned:    ${rows.length}`);
  console.log(`OK (≈ Collective):   ${counts.ok}`);
  console.log(`Mismatch:            ${counts.mismatch}`);
  console.log(`Critical (< cost):   ${counts.critical}`);
  console.log(`Missing cost:        ${counts.no_cost}`);
  console.log(`ACTIVE critical:     ${activeCritical.length}`);
  console.log(`ACTIVE mismatch:     ${activeMismatch.length}`);
  console.log(`Under-priced SKUs:   ${under.length} (Σ Δ $${underSum.toFixed(2)} if 1 sold each)`);

  console.log('\nWorst ACTIVE critical (price < Collective cost):');
  for (const r of activeCritical.slice(0, 15)) {
    console.log(
      `  $${r.shopifyPrice.toFixed(2).padStart(8)} vs cost $${(r.collectiveCost || 0).toFixed(2)} retail~$${(r.inferredRetail || 0).toFixed(2)}  ${r.sku || r.handle}`
    );
  }

  console.log('\nWorst ACTIVE under-retail mismatches:');
  for (const r of activeMismatch
    .filter((x) => (x.deltaVsRetail || 0) < 0)
    .sort((a, b) => (a.deltaVsRetail || 0) - (b.deltaVsRetail || 0))
    .slice(0, 15)) {
    console.log(
      `  $${r.shopifyPrice.toFixed(2).padStart(8)} → $${(r.inferredRetail || 0).toFixed(2)} (Δ ${r.deltaVsRetail?.toFixed(2)})  ${r.sku || r.handle}`
    );
  }

  console.log(`\nWrote full:       ${outPath}`);
  console.log(`Wrote mismatches: ${badPath}`);
  console.log('(dry-run — no Shopify writes)\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
