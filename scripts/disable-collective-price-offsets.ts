#!/usr/bin/env tsx
/**
 * Disable shipping price-offsets for Shopify Collective suppliers.
 *
 * 1) Snapshot + set vendor_shipping_rates.base_rate = 0 for Collective vendors
 * 2) Rollback Shopify variant prices that still include the old offset
 *    - Prefer shopify_price_audit.shopify_price when present
 *    - Else subtract the pre-zero rate for Collective-tagged products
 *
 * Dry-run by default. Pass --apply to write Neon + Shopify.
 *
 * Usage:
 *   npx tsx scripts/disable-collective-price-offsets.ts
 *   npx tsx scripts/disable-collective-price-offsets.ts --apply
 *   npx tsx scripts/disable-collective-price-offsets.ts --apply --limit=50
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import {
  COLLECTIVE_TAG,
  COLLECTIVE_VENDORS,
  isCollectiveVendor,
  tagsIndicateCollective,
} from '@/lib/shipping/collective-vendors';
import { getVendorAliasKeys } from '@/lib/shipping/vendor-aliases';
import { hasFlag, getArg } from './lib/migration-cli';

type RateRow = { vendor_name: string; base_rate: string; active: boolean };

type AuditRow = {
  variant_id: string;
  product_id: string;
  vendor_name: string;
  shopify_price: string;
  shipping_offset: string;
  adjusted_price: string;
};

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  tags: string[];
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string | null;
        price: string;
        compareAtPrice: string | null;
      };
    }>;
  };
};

type PlanRow = {
  source: 'audit' | 'subtract';
  productId: string;
  handle: string;
  title: string;
  vendor: string;
  variantId: string;
  variantIdNumeric: string;
  sku: string;
  currentPrice: number;
  targetPrice: number;
  offsetRemoved: number;
};

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function money(n: number): string {
  return n.toFixed(2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cents(n: number): number {
  return Math.round(n * 100) % 100;
}

/** Common AUD retail endings used by Collective catalogues. */
function looksLikeRetailPrice(n: number): boolean {
  const c = cents(n);
  return c === 0 || c === 50 || c === 90 || c === 95 || c === 99;
}

/**
 * Prefer subtracting only when current looks like retail+offset and the
 * restored amount looks like a normal retail price.
 * Flat dollar offsets (8/12/20) keep .95 endings on both sides — those must
 * come from audit rows only, or we would keep re-matching fixed prices.
 */
function shouldSubtractOffset(current: number, offset: number): boolean {
  if (!(offset > 0) || !(current > offset)) return false;
  const target = round2(current - offset);
  if (target <= 0) return false;
  if (!looksLikeRetailPrice(target)) return false;

  const offsetCents = cents(offset);
  // EE-style $18.50 bump: inflated price may end in .50 (318.50) or .45 (55.45)
  if (offsetCents === 50) {
    if (!looksLikeRetailPrice(current)) return true;
    // e.g. 318.50 → 300.00 — removing offset lands on a round .00 retail
    if (cents(target) === 0) return true;
    return false;
  }
  // 12.95-style offsets often land on .90/.95 when inflated
  if (offsetCents === 95) {
    const c = cents(current);
    return c === 90 || c === 95;
  }
  // Flat dollar offsets: refuse subtract without audit (handled separately)
  return false;
}

async function loadRateMap(sql: ReturnType<typeof neon>): Promise<{
  byExact: Map<string, number>;
  byKey: Map<string, number>;
}> {
  const rows = (await sql`
    SELECT vendor_name, base_rate::text as base_rate, active
    FROM vendor_shipping_rates
    WHERE active = true
  `) as RateRow[];

  const byExact = new Map<string, number>();
  const byKey = new Map<string, number>();

  for (const row of rows) {
    const rate = Number(row.base_rate);
    if (!Number.isFinite(rate)) continue;
    byExact.set(row.vendor_name, rate);
    byExact.set(row.vendor_name.toLowerCase(), rate);
    for (const key of getVendorAliasKeys(row.vendor_name)) {
      // Do not prefer max across aliases — first exact spelling wins via byExact.
      if (!byKey.has(key)) byKey.set(key, rate);
    }
  }
  return { byExact, byKey };
}

/** Last known Collective offsets before disable — used if Neon is already zeroed. */
const FALLBACK_OFFSETS: Record<string, number> = {
  'exclusively equine': 18.5,
  'can animal care': 20,
  'toptac international': 12.95,
  toptac: 12.95,
  'jnk collective': 12,
  'jnk': 12,
  'little equine co.': 8,
  'little equine co': 8,
  'little equine': 15,
  'plum tack': 8,
  'qj riding wear': 8,
  'qj ridingwear': 10,
  'living horse tails jewellery by monika': 8,
  'living horse tales jewellery by monika': 8,
  'living horse tails jewellery By Monika': 8,
};

function rateForVendor(
  vendor: string,
  rates: { byExact: Map<string, number>; byKey: Map<string, number> }
): number {
  const exact =
    rates.byExact.get(vendor) ?? rates.byExact.get(vendor.toLowerCase());
  if (exact != null && exact > 0) return exact;

  for (const key of getVendorAliasKeys(vendor)) {
    const rate = rates.byKey.get(key);
    if (rate != null && rate > 0) return rate;
  }

  const fallback = FALLBACK_OFFSETS[vendor.toLowerCase().trim()];
  if (fallback != null && fallback > 0) return fallback;

  return exact != null ? 0 : 0;
}

async function zeroCollectiveRates(
  sql: ReturnType<typeof neon>,
  apply: boolean
): Promise<RateRow[]> {
  const all = (await sql`
    SELECT vendor_name, base_rate::text as base_rate, active
    FROM vendor_shipping_rates
    ORDER BY vendor_name
  `) as RateRow[];

  const targets = all.filter(
    (r) => isCollectiveVendor(r.vendor_name) && Number(r.base_rate) !== 0
  );

  console.log(`\nRates to zero (${targets.length}):`);
  for (const r of targets) {
    console.log(`  ${r.active ? 'Y' : 'N'}  ${r.vendor_name.padEnd(40)} $${r.base_rate} → $0`);
  }

  if (apply && targets.length > 0) {
    for (const r of targets) {
      await sql`
        UPDATE vendor_shipping_rates
        SET base_rate = 0, updated_at = NOW()
        WHERE vendor_name = ${r.vendor_name}
      `;
    }
    console.log('✓ Neon vendor_shipping_rates updated');
  } else if (!apply) {
    console.log('(dry-run — rates not written)');
  }

  return targets;
}

async function loadAuditRows(sql: ReturnType<typeof neon>): Promise<AuditRow[]> {
  const rows = (await sql`
    SELECT variant_id, product_id, vendor_name,
           shopify_price::text as shopify_price,
           shipping_offset::text as shipping_offset,
           adjusted_price::text as adjusted_price
    FROM shopify_price_audit
    WHERE shipping_offset::numeric > 0
  `) as AuditRow[];
  return rows.filter((r) => isCollectiveVendor(r.vendor_name));
}

async function fetchCollectiveProducts(): Promise<ProductNode[]> {
  const out: ProductNode[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: ProductNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: `query($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          edges {
            node {
              id
              handle
              title
              vendor
              tags
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: {
        first: 50,
        after: cursor,
        query: `tag:"${COLLECTIVE_TAG}"`,
      },
      cache: 'no-store',
    });

    for (const { node } of data.products.edges) out.push(node);
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return out;
}

function buildPlan(input: {
  products: ProductNode[];
  auditByVariant: Map<string, AuditRow>;
  ratesBeforeZero: Map<string, number>;
  limit?: number;
}): PlanRow[] {
  const plan: PlanRow[] = [];
  const seen = new Set<string>();

  for (const product of input.products) {
    if (!tagsIndicateCollective(product.tags) && !isCollectiveVendor(product.vendor)) {
      continue;
    }

    for (const { node: variant } of product.variants.edges) {
      const variantIdNumeric = gidNumeric(variant.id);
      if (seen.has(variantIdNumeric)) continue;

      const currentPrice = Number(variant.price);
      if (!Number.isFinite(currentPrice)) continue;

      const audit = input.auditByVariant.get(variantIdNumeric);
      if (audit) {
        const target = Number(audit.shopify_price);
        const offset = Number(audit.shipping_offset);
        if (
          Number.isFinite(target) &&
          target > 0 &&
          Number.isFinite(offset) &&
          offset > 0 &&
          Math.abs(currentPrice - target) >= 0.01
        ) {
          // Only roll back when current still looks inflated (≈ adjusted or ≥ base+offset)
          const adjusted = Number(audit.adjusted_price);
          const looksInflated =
            (Number.isFinite(adjusted) && Math.abs(currentPrice - adjusted) < 0.05) ||
            currentPrice >= target + offset - 0.05;
          if (looksInflated) {
            plan.push({
              source: 'audit',
              productId: gidNumeric(product.id),
              handle: product.handle,
              title: product.title,
              vendor: product.vendor,
              variantId: variant.id,
              variantIdNumeric,
              sku: variant.sku || '',
              currentPrice,
              targetPrice: round2(target),
              offsetRemoved: round2(currentPrice - target),
            });
            seen.add(variantIdNumeric);
            if (input.limit && plan.length >= input.limit) return plan;
            continue;
          }
        }
      }

      const offset = rateForVendor(product.vendor, input.ratesBeforeZero);
      if (!shouldSubtractOffset(currentPrice, offset)) continue;

      const target = round2(currentPrice - offset);
      plan.push({
        source: 'subtract',
        productId: gidNumeric(product.id),
        handle: product.handle,
        title: product.title,
        vendor: product.vendor,
        variantId: variant.id,
        variantIdNumeric,
        sku: variant.sku || '',
        currentPrice,
        targetPrice: target,
        offsetRemoved: offset,
      });
      seen.add(variantIdNumeric);
      if (input.limit && plan.length >= input.limit) return plan;
    }
  }

  return plan;
}

async function markAuditRolledBack(
  sql: ReturnType<typeof neon>,
  row: PlanRow
): Promise<void> {
  await sql`
    UPDATE shopify_price_audit
    SET
      shipping_offset = 0,
      adjusted_price = ${money(row.targetPrice)},
      shopify_price = ${money(row.targetPrice)},
      last_source = 'collective_offset_disable',
      updated_at = NOW()
    WHERE variant_id = ${row.variantIdNumeric}
  `;
}

async function main(): Promise<void> {
  const apply = hasFlag('--apply');
  const limitArg = getArg('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('DATABASE_URL / POSTGRES_URL required');

  console.log(`\nDisable Collective price offsets (${apply ? 'APPLY' : 'DRY-RUN'})\n`);

  const sql = neon(dbUrl);

  // Snapshot rates BEFORE zeroing — needed for subtract fallback
  const ratesBeforeZero = await loadRateMap(sql);
  console.log('Collective vendor rates (pre-change):');
  for (const name of COLLECTIVE_VENDORS) {
    console.log(`  ${name.padEnd(40)} $${rateForVendor(name, ratesBeforeZero)}`);
  }

  await zeroCollectiveRates(sql, apply);

  console.log('\nLoading shopify_price_audit for Collective vendors…');
  const auditRows = await loadAuditRows(sql);
  const auditByVariant = new Map(auditRows.map((r) => [r.variant_id, r]));
  console.log(`  audit rows with offset > 0: ${auditRows.length}`);

  console.log('\nFetching Shopify products tagged "shopify collective"…');
  const products = await fetchCollectiveProducts();
  console.log(`  products: ${products.length}`);

  const plan = buildPlan({
    products,
    auditByVariant,
    ratesBeforeZero,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  const byVendor = new Map<string, number>();
  for (const row of plan) {
    byVendor.set(row.vendor, (byVendor.get(row.vendor) || 0) + 1);
  }
  console.log(`\nRollback plan: ${plan.length} variants`);
  for (const [vendor, n] of [...byVendor.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${vendor}: ${n}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(process.cwd(), `exports/collective-offset-disable-${stamp}.csv`);
  const header = [
    'source',
    'product_id',
    'handle',
    'title',
    'vendor',
    'variant_id',
    'sku',
    'current_price',
    'target_price',
    'offset_removed',
  ];
  const lines = [header.join(',')];
  for (const row of plan) {
    lines.push(
      [
        row.source,
        row.productId,
        csvEscape(row.handle),
        csvEscape(row.title),
        csvEscape(row.vendor),
        row.variantIdNumeric,
        csvEscape(row.sku),
        money(row.currentPrice),
        money(row.targetPrice),
        money(row.offsetRemoved),
      ].join(',')
    );
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`\nWrote ${outPath}`);

  if (!apply) {
    console.log('\nDry-run complete. Re-run with --apply to write Neon rates + Shopify prices.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < plan.length; i += 1) {
    const row = plan[i];
    try {
      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: row.variantIdNumeric,
        price: money(row.targetPrice),
      });
      await markAuditRolledBack(sql, row);
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
    }
  }

  console.log(`\nDone. Updated ${ok}, failed ${fail}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
