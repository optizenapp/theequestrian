#!/usr/bin/env tsx
/**
 * Restore underpriced Collective vendor variants to inferred Collective retail.
 *
 * Uses always-synced inventoryItem.unitCost + retailer margin:
 *   retail ≈ cost / (1 - margin%)
 *
 * Only RAISES prices that are below inferred retail (and optionally below cost).
 * Does not lower overpriced variants.
 *
 * Dry-run by default. Pass --apply to write Shopify prices.
 *
 * Usage:
 *   npx tsx scripts/restore-collective-vendor-prices.ts --vendor="Toptac International" --margin=10
 *   npx tsx scripts/restore-collective-vendor-prices.ts --vendor="Toptac International" --margin=10 --apply
 *   npx tsx scripts/restore-collective-vendor-prices.ts --vendor="Toptac International" --margin=10 --apply --limit=25
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import { getArg, hasFlag } from './lib/migration-cli';
import { inferCollectiveRetail, round2 } from './lib/collective-retail';

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

type PlanRow = {
  productId: string;
  handle: string;
  title: string;
  vendor: string;
  status: string;
  variantId: string;
  variantIdNumeric: string;
  variantTitle: string;
  sku: string;
  currentPrice: number;
  collectiveCost: number;
  targetPrice: number;
  delta: number;
  reason: string;
};

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function money(n: number): string {
  return n.toFixed(2);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
    console.log(`  fetched products=${out.length}…`);
    await sleep(150);
  }
  return out;
}

function buildPlan(
  products: ProductNode[],
  marginPct: number,
  tol: number,
  limit?: number
): PlanRow[] {
  const plan: PlanRow[] = [];
  for (const product of products) {
    for (const { node: variant } of product.variants.edges) {
      const current = Number(variant.price);
      const costRaw = variant.inventoryItem?.unitCost?.amount;
      const cost = costRaw != null ? Number(costRaw) : NaN;
      if (!Number.isFinite(current) || !Number.isFinite(cost) || cost <= 0) continue;

      const target = inferCollectiveRetail(cost, marginPct);
      const delta = round2(current - target);
      // Only raise underpriced variants
      if (delta >= -tol) continue;

      const reasons: string[] = ['under_collective_retail'];
      if (current + 0.005 < cost) reasons.unshift('below_collective_cost');
      if (current <= 1.005 && cost > 5) reasons.push('one_dollar_smash');

      plan.push({
        productId: gidNumeric(product.id),
        handle: product.handle,
        title: product.title,
        vendor: product.vendor,
        status: product.status,
        variantId: variant.id,
        variantIdNumeric: gidNumeric(variant.id),
        variantTitle: variant.title,
        sku: variant.sku || '',
        currentPrice: round2(current),
        collectiveCost: round2(cost),
        targetPrice: target,
        delta,
        reason: reasons.join('|'),
      });
      if (limit && plan.length >= limit) return plan;
    }
  }
  return plan;
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor') || 'Toptac International';
  const marginPct = Number(getArg('--margin') || '10');
  const statusFilter = (getArg('--status') || 'active').toLowerCase();
  const tol = Number(getArg('--tol') || '0.50');
  const limitArg = getArg('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  const apply = hasFlag('--apply');

  if (!Number.isFinite(marginPct) || marginPct <= 0 || marginPct >= 100) {
    throw new Error('--margin must be between 0 and 100');
  }

  console.log(
    `\nRestore Collective retail prices (${apply ? 'APPLY' : 'DRY-RUN'}) — vendor="${vendor}" margin=${marginPct}%\n`
  );

  // Sanity: known Toptac brush cost → $13.95
  const brushCheck = inferCollectiveRetail(12.56, 10);
  console.log(`Retail inference check: cost $12.56 @ 10% → $${money(brushCheck)} (expect 13.95)`);
  if (Math.abs(brushCheck - 13.95) > 0.02) {
    console.warn('WARNING: inference drift vs known Collective retail $13.95');
  }

  const products = await fetchVendorProducts(vendor, statusFilter === 'all' ? undefined : statusFilter);
  console.log(`Products: ${products.length}`);

  const plan = buildPlan(
    products,
    marginPct,
    tol,
    Number.isFinite(limit) ? limit : undefined
  );
  plan.sort((a, b) => a.delta - b.delta);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outPath = resolve(
    process.cwd(),
    `exports/collective-price-restore-${slug}-${apply ? 'apply' : 'dry'}-${stamp}.csv`
  );

  const header = [
    'status',
    'vendor',
    'product_id',
    'handle',
    'title',
    'variant_id',
    'variant_title',
    'sku',
    'current_price',
    'collective_cost',
    'target_price',
    'delta',
    'reason',
  ];
  const lines = [
    header.join(','),
    ...plan.map((r) =>
      [
        r.status,
        csvEscape(r.vendor),
        r.productId,
        csvEscape(r.handle),
        csvEscape(r.title),
        r.variantIdNumeric,
        csvEscape(r.variantTitle),
        csvEscape(r.sku),
        money(r.currentPrice),
        money(r.collectiveCost),
        money(r.targetPrice),
        money(r.delta),
        r.reason,
      ].join(',')
    ),
  ];
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');

  const belowCost = plan.filter((r) => r.currentPrice < r.collectiveCost).length;
  const dollar = plan.filter((r) => r.currentPrice <= 1.005).length;
  const lift = plan.reduce((s, r) => s + Math.abs(r.delta), 0);

  console.log(`\nRestore plan: ${plan.length} variants`);
  console.log(`  below Collective cost: ${belowCost}`);
  console.log(`  at/under $1:           ${dollar}`);
  console.log(`  total $ lift (1 ea):   $${lift.toFixed(2)}`);
  console.log(`Wrote ${outPath}`);

  console.log('\nSample (worst underpriced):');
  for (const r of plan.slice(0, 12)) {
    console.log(
      `  $${money(r.currentPrice).padStart(8)} → $${money(r.targetPrice)}  (cost $${money(r.collectiveCost)})  ${r.sku || r.handle}`
    );
  }

  if (!apply) {
    console.log('\nDry-run complete. Re-run with --apply to update Shopify prices.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < plan.length; i += 1) {
    const row = plan[i]!;
    try {
      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: row.variantIdNumeric,
        price: money(row.targetPrice),
      });
      ok += 1;
      if (ok % 25 === 0 || i === plan.length - 1) {
        console.log(`  updated ${ok}/${plan.length}…`);
      }
      await sleep(200);
    } catch (error) {
      fail += 1;
      console.error(
        `  FAIL ${row.handle} ${row.variantIdNumeric}:`,
        error instanceof Error ? error.message : error
      );
      await sleep(500);
    }
  }

  console.log(`\nDone. Updated ${ok}, failed ${fail}.`);
}

const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('restore-collective-vendor-prices.ts') ||
    process.argv[1].endsWith('restore-collective-vendor-prices.js'));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
