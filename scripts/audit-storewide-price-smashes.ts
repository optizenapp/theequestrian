#!/usr/bin/env tsx
/**
 * Store-wide DRY-RUN price smash audit.
 *
 * Scans every Shopify product/variant (no writes) and flags:
 *  - price at/near $1
 *  - selling below unit cost
 *  - Collective double-subtract pattern (retail − shipping offset applied twice)
 *  - matches against Sep-1 offset-disable export plans that targeted $1.00
 *
 * Usage:
 *   npx tsx scripts/audit-storewide-price-smashes.ts
 *   npx tsx scripts/audit-storewide-price-smashes.ts --status=active
 *   npx tsx scripts/audit-storewide-price-smashes.ts --limit-products=200
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import {
  isCollectiveProduct,
  isCollectiveVendor,
} from '@/lib/shipping/collective-vendors';
import { getArg, hasFlag } from './lib/migration-cli';

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

type Flag =
  | 'price_lte_1'
  | 'price_lte_2'
  | 'below_cost'
  | 'collective_double_subtract'
  | 'csv_targeted_1'
  | 'csv_restore_known';

type Finding = {
  flags: Flag[];
  productId: string;
  handle: string;
  title: string;
  vendor: string;
  status: string;
  collective: boolean;
  variantId: string;
  variantIdNumeric: string;
  variantTitle: string;
  sku: string;
  price: number;
  compareAt: number | null;
  unitCost: number | null;
  suggestedRestore: number | null;
  restoreSource: string;
  notes: string;
};

/** Last known Collective shipping offsets before disable (AUD). */
const COLLECTIVE_OFFSETS: Record<string, number> = {
  'toptac international': 12.95,
  toptac: 12.95,
  'jnk collective': 12,
  jnk: 12,
  'exclusively equine': 18.5,
  'little equine co.': 8,
  'little equine co': 8,
  'can animal care': 20,
  'plum tack': 8,
  'qj riding wear': 8,
};

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cents(n: number): number {
  return Math.round(n * 100) % 100;
}

function looksLikeRetailPrice(n: number): boolean {
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

function offsetForVendor(vendor: string): number {
  const key = vendor.toLowerCase().trim();
  if (COLLECTIVE_OFFSETS[key] != null) return COLLECTIVE_OFFSETS[key];
  for (const [k, v] of Object.entries(COLLECTIVE_OFFSETS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 0;
}

type CsvHint = {
  goodTarget: number | null;
  targetedOne: boolean;
  lastCurrent: number | null;
};

/** Load Sep-1 offset-disable exports for restore hints + confirmed smash targets. */
function loadCsvHints(): Map<string, CsvHint> {
  const dir = resolve(process.cwd(), 'exports');
  const map = new Map<string, CsvHint>();
  if (!fs.existsSync(dir)) return map;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('collective-offset-disable-2026-09-01') && f.endsWith('.csv'))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(resolve(dir, file), 'utf-8');
    const lines = raw.split(/\r?\n/).slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      // source,product_id,handle,title,vendor,variant_id,sku,current_price,target_price,offset_removed
      const parts = line.split(',');
      if (parts.length < 10) continue;
      const variantId = parts[5]?.trim();
      const current = Number(parts[7]);
      const target = Number(parts[8]);
      if (!variantId || !Number.isFinite(target)) continue;

      const prev = map.get(variantId) || {
        goodTarget: null,
        targetedOne: false,
        lastCurrent: null,
      };
      prev.lastCurrent = Number.isFinite(current) ? current : prev.lastCurrent;

      if (Math.abs(target - 1) < 0.005) {
        prev.targetedOne = true;
      } else if (target > 1.5 && (prev.goodTarget == null || target > prev.goodTarget)) {
        // Prefer the first sensible restore (correct retail after single subtract)
        if (prev.goodTarget == null) prev.goodTarget = round2(target);
      }
      map.set(variantId, prev);
    }
  }

  console.log(`CSV hints loaded: ${map.size} variants from ${files.length} export files`);
  return map;
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
                id
                title
                sku
                price
                compareAtPrice
                inventoryItem {
                  unitCost { amount currencyCode }
                }
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

function evaluateVariant(input: {
  product: Omit<ProductNode, 'variants'>;
  variant: VariantNode;
  csv: CsvHint | undefined;
}): Finding | null {
  const price = Number(input.variant.price);
  if (!Number.isFinite(price)) return null;

  const compareAtRaw = input.variant.compareAtPrice
    ? Number(input.variant.compareAtPrice)
    : null;
  const compareAt =
    compareAtRaw != null && Number.isFinite(compareAtRaw) ? compareAtRaw : null;
  const costRaw = input.variant.inventoryItem?.unitCost?.amount;
  const unitCost =
    costRaw != null && Number.isFinite(Number(costRaw)) ? Number(costRaw) : null;

  const collective = isCollectiveProduct({
    vendor: input.product.vendor,
    tags: input.product.tags,
  });
  const offset = collective ? offsetForVendor(input.product.vendor) : 0;
  const variantIdNumeric = gidNumeric(input.variant.id);

  const flags: Flag[] = [];
  const notes: string[] = [];
  let suggestedRestore: number | null = null;
  let restoreSource = '';

  if (price <= 1.005) {
    flags.push('price_lte_1');
  } else if (price <= 2.005) {
    flags.push('price_lte_2');
  }

  if (unitCost != null && unitCost > 0.5 && price + 0.005 < unitCost) {
    flags.push('below_cost');
    notes.push(`price $${price.toFixed(2)} < cost $${unitCost.toFixed(2)}`);
  }

  if (input.csv?.targetedOne) {
    flags.push('csv_targeted_1');
  }
  if (input.csv?.goodTarget != null && input.csv.goodTarget > price + 0.5) {
    flags.push('csv_restore_known');
    suggestedRestore = input.csv.goodTarget;
    restoreSource = 'sep1_offset_disable_csv';
  }

  // Double-subtract: current + offset looks like normal retail, and either
  // below cost or current is suspiciously round/low vs restored retail.
  if (collective && offset > 0 && price > 0) {
    const restored = round2(price + offset);
    const looksDouble =
      looksLikeRetailPrice(restored) &&
      (price < 3 ||
        (unitCost != null && price < unitCost) ||
        (cents(price) === 0 && cents(restored) === 95) ||
        (cents(price) === 0 && cents(restored) === 90));

    // Also: retail ending .95 that equals cost-ish − margin after one subtract
    // e.g. 13.95 − 12.95 = 1.00 already caught above; catch 7.95 → −4.95 etc.
    if (
      looksDouble &&
      restored >= 5 &&
      (unitCost == null || restored >= unitCost - 0.5)
    ) {
      flags.push('collective_double_subtract');
      notes.push(`$${price.toFixed(2)} + $${offset} → $${restored.toFixed(2)} looks like retail`);
      if (suggestedRestore == null) {
        suggestedRestore = restored;
        restoreSource = 'price_plus_collective_offset';
      }
    }
  }

  // Prefer compare-at as restore when it's a clear higher retail
  if (
    suggestedRestore == null &&
    compareAt != null &&
    compareAt > price + 1 &&
    looksLikeRetailPrice(compareAt) &&
    (flags.includes('price_lte_1') || flags.includes('below_cost'))
  ) {
    suggestedRestore = compareAt;
    restoreSource = 'compare_at';
  }

  if (flags.length === 0) return null;

  // Deduplicate flags
  const unique = [...new Set(flags)];

  return {
    flags: unique,
    productId: gidNumeric(input.product.id),
    handle: input.product.handle,
    title: input.product.title,
    vendor: input.product.vendor,
    status: input.product.status,
    collective,
    variantId: input.variant.id,
    variantIdNumeric,
    variantTitle: input.variant.title,
    sku: input.variant.sku || '',
    price: round2(price),
    compareAt: compareAt != null ? round2(compareAt) : null,
    unitCost: unitCost != null ? round2(unitCost) : null,
    suggestedRestore,
    restoreSource,
    notes: notes.join('; '),
  };
}

async function main(): Promise<void> {
  const statusFilter = (getArg('--status') || '').toLowerCase(); // active|draft|archived|''
  const limitProducts = getArg('--limit-products')
    ? Number(getArg('--limit-products'))
    : undefined;

  console.log('\nStore-wide price smash audit (DRY-RUN — no writes)\n');
  if (statusFilter) console.log(`Status filter: ${statusFilter}`);
  if (limitProducts) console.log(`Product limit: ${limitProducts}`);

  const csvHints = loadCsvHints();

  let cursor: string | null = null;
  let hasNext = true;
  let productsScanned = 0;
  let variantsScanned = 0;
  let pages = 0;
  const findings: Finding[] = [];
  const byFlag = new Map<Flag, number>();
  const byVendor = new Map<string, number>();

  const queryFilter = statusFilter ? `status:${statusFilter}` : undefined;

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
              status
              tags
              variants(first: 100) {
                pageInfo { hasNextPage endCursor }
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    inventoryItem {
                      unitCost { amount currencyCode }
                    }
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
        query: queryFilter || null,
      },
    });

    pages += 1;

    for (const { node: product } of data.products.edges) {
      productsScanned += 1;
      let variants = product.variants.edges.map((e) => e.node);
      if (product.variants.pageInfo.hasNextPage) {
        variants = await fetchAllVariantsForProduct(product.id, product.variants);
      }

      for (const variant of variants) {
        variantsScanned += 1;
        const finding = evaluateVariant({
          product,
          variant,
          csv: csvHints.get(gidNumeric(variant.id)),
        });
        if (!finding) continue;
        findings.push(finding);
        for (const f of finding.flags) {
          byFlag.set(f, (byFlag.get(f) || 0) + 1);
        }
        byVendor.set(finding.vendor, (byVendor.get(finding.vendor) || 0) + 1);
      }

      if (limitProducts && productsScanned >= limitProducts) {
        hasNext = false;
        break;
      }
    }

    if (limitProducts && productsScanned >= limitProducts) break;

    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;

    if (pages % 10 === 0 || !hasNext) {
      console.log(
        `  pages=${pages} products=${productsScanned} variants=${variantsScanned} findings=${findings.length}`
      );
    }

    await sleep(150);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(process.cwd(), `exports/price-smash-audit-${stamp}.csv`);
  const header = [
    'flags',
    'collective',
    'status',
    'vendor',
    'product_id',
    'handle',
    'title',
    'variant_id',
    'variant_title',
    'sku',
    'price',
    'compare_at',
    'unit_cost',
    'suggested_restore',
    'restore_source',
    'notes',
  ].join(',');

  const rows = findings.map((f) =>
    [
      f.flags.join('|'),
      f.collective ? 'Y' : 'N',
      f.status,
      csvEscape(f.vendor),
      f.productId,
      csvEscape(f.handle),
      csvEscape(f.title),
      f.variantIdNumeric,
      csvEscape(f.variantTitle),
      csvEscape(f.sku),
      f.price.toFixed(2),
      f.compareAt != null ? f.compareAt.toFixed(2) : '',
      f.unitCost != null ? f.unitCost.toFixed(2) : '',
      f.suggestedRestore != null ? f.suggestedRestore.toFixed(2) : '',
      f.restoreSource,
      csvEscape(f.notes),
    ].join(',')
  );

  fs.writeFileSync(outPath, [header, ...rows].join('\n') + '\n', 'utf-8');

  const critical = findings.filter(
    (f) =>
      f.flags.includes('price_lte_1') ||
      f.flags.includes('below_cost') ||
      f.flags.includes('collective_double_subtract') ||
      f.flags.includes('csv_targeted_1')
  );

  const collectiveCritical = critical.filter((f) => f.collective);
  const activeCritical = critical.filter((f) => f.status === 'ACTIVE');

  console.log('\n========== SUMMARY ==========');
  console.log(`Products scanned:  ${productsScanned}`);
  console.log(`Variants scanned:  ${variantsScanned}`);
  console.log(`Total findings:    ${findings.length}`);
  console.log(`Critical findings: ${critical.length}`);
  console.log(`  Collective:      ${collectiveCritical.length}`);
  console.log(`  ACTIVE:          ${activeCritical.length}`);
  console.log('\nBy flag:');
  for (const [flag, n] of [...byFlag.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${flag.padEnd(28)} ${n}`);
  }
  console.log('\nTop vendors by findings:');
  for (const [vendor, n] of [...byVendor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${String(n).padStart(5)}  ${vendor}`);
  }
  console.log(`\nWrote ${outPath}`);
  console.log('(dry-run complete — no Shopify writes)\n');

  // Silence unused import warning if tree-shaken oddly
  void isCollectiveVendor;
  void hasFlag;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
