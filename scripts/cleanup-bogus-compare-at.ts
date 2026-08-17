#!/usr/bin/env tsx
/**
 * Clear compare_at_price when it is set but not greater than price.
 *
 * Those variants keep products in Shopify's automated IS_PRICE_REDUCED
 * `on-sale` collection without showing a real discount on the storefront.
 *
 * Dry-run by default (writes a CSV). Pass --apply to clear compare_at in Shopify.
 *
 * Usage:
 *   npx tsx scripts/cleanup-bogus-compare-at.ts
 *   npx tsx scripts/cleanup-bogus-compare-at.ts --collection=on-sale
 *   npx tsx scripts/cleanup-bogus-compare-at.ts --csv=exports/bogus-compare-at-....csv --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import { hasFlag, getArg } from './lib/migration-cli';

const COLLECTIVE_TAG = 'shopify collective';

type Row = {
  productId: string;
  productHandle: string;
  productTitle: string;
  vendor: string;
  variantId: string;
  variantIdNumeric: string;
  variantTitle: string;
  sku: string;
  price: string;
  compareAt: string;
  inOnSaleCollection: boolean;
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

function gidNumeric(gid: string): string {
  return gid.split('/').pop() || gid;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function isCollective(tags: string[]): boolean {
  return tags.some((t) => t.toLowerCase() === COLLECTIVE_TAG);
}

function collectBogusRows(products: ProductNode[], inOnSale: boolean, collectiveOnly: boolean): Row[] {
  const rows: Row[] = [];
  for (const node of products) {
    if (collectiveOnly && !isCollective(node.tags)) continue;
    for (const { node: variant } of node.variants.edges) {
      if (!variant.compareAtPrice) continue;
      const price = Number(variant.price);
      const compareAt = Number(variant.compareAtPrice);
      if (!Number.isFinite(price) || !Number.isFinite(compareAt)) continue;
      if (compareAt > price) continue;
      rows.push({
        productId: node.id,
        productHandle: node.handle,
        productTitle: node.title,
        vendor: node.vendor,
        variantId: variant.id,
        variantIdNumeric: gidNumeric(variant.id),
        variantTitle: variant.title,
        sku: variant.sku || '',
        price: price.toFixed(2),
        compareAt: compareAt.toFixed(2),
        inOnSaleCollection: inOnSale,
      });
    }
  }
  return rows;
}

const PRODUCT_FIELDS = `
  id handle title vendor tags
  variants(first: 100) {
    edges { node { id title sku price compareAtPrice } }
  }
`;

async function scanCollection(handle: string, collectiveOnly: boolean): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  let scanned = 0;

  while (hasNext) {
    const data = await shopifyAdminFetch<{
      collectionByHandle: {
        products: {
          edges: Array<{ node: ProductNode }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } | null;
    }>({
      query: `query($handle: String!, $cursor: String) {
        collectionByHandle(handle: $handle) {
          products(first: 50, after: $cursor) {
            edges { node { ${PRODUCT_FIELDS} } }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      variables: { handle, cursor },
    });

    const products = data.collectionByHandle?.products;
    if (!products) throw new Error(`Collection not found: ${handle}`);
    scanned += products.edges.length;
    rows.push(...collectBogusRows(products.edges.map((e) => e.node), true, collectiveOnly));
    hasNext = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
    console.log(`  scanned ${scanned} collection products, ${rows.length} bogus compare-at…`);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur);
      cur = '';
    } else cur += ch;
  }
  cols.push(cur);
  return cols;
}

function loadRowsFromCsv(csvPath: string): Row[] {
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const idx = (name: string) => header.indexOf(name);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      productId: cols[idx('product_id')] || '',
      productHandle: cols[idx('product_handle')] || '',
      productTitle: cols[idx('product_title')] || '',
      vendor: cols[idx('vendor')] || '',
      variantId: cols[idx('variant_id')] || '',
      variantIdNumeric: cols[idx('variant_id_numeric')] || '',
      variantTitle: cols[idx('variant_title')] || '',
      sku: cols[idx('sku')] || '',
      price: cols[idx('price')] || '',
      compareAt: cols[idx('compare_at')] || '',
      inOnSaleCollection: cols[idx('in_on_sale_collection')] === 'true',
    };
  });
}

function writeCsv(rows: Row[], outPath: string): void {
  const header = [
    'product_handle',
    'product_title',
    'vendor',
    'product_id',
    'variant_id',
    'variant_id_numeric',
    'variant_title',
    'sku',
    'price',
    'compare_at',
    'in_on_sale_collection',
    'action',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.productHandle,
        row.productTitle,
        row.vendor,
        row.productId,
        row.variantId,
        row.variantIdNumeric,
        row.variantTitle,
        row.sku,
        row.price,
        row.compareAt,
        String(row.inOnSaleCollection),
        'clear_compare_at',
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf-8');
}

async function main(): Promise<void> {
  const apply = hasFlag('--apply');
  const collectiveOnly = !hasFlag('--all-vendors');
  const collectionHandle = getArg('--collection') || 'on-sale';
  const existingCsv = getArg('--csv');

  let rows: Row[];
  let outPath = existingCsv ? resolve(process.cwd(), existingCsv) : '';

  if (existingCsv) {
    if (!fs.existsSync(outPath)) throw new Error(`CSV not found: ${outPath}`);
    rows = loadRowsFromCsv(outPath);
    console.log(`Loaded ${rows.length} row(s) from ${existingCsv}`);
  } else {
    console.log(
      `Scanning collection "${collectionHandle}"` +
        `${collectiveOnly ? ' (Shopify Collective tag only)' : ''}…`
    );
    rows = await scanCollection(collectionHandle, collectiveOnly);
  }

  const productCount = new Set(rows.map((r) => r.productId)).size;
  console.log(`\nBogus compare-at variants: ${rows.length} across ${productCount} products`);
  for (const row of rows.slice(0, 15)) {
    console.log(`  ${row.productHandle} / ${row.variantTitle}: $${row.price} compare $${row.compareAt}`);
  }
  if (rows.length > 15) console.log(`  … and ${rows.length - 15} more`);

  if (!existingCsv) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    outPath = resolve(process.cwd(), `exports/bogus-compare-at-${stamp}.csv`);
    writeCsv(rows, outPath);
    console.log(`\nWrote ${outPath}`);
  }

  if (!apply) {
    console.log('\nDRY RUN — no Shopify writes. Re-run with --apply to clear compare_at.');
    const rel = outPath.replace(`${process.cwd()}/`, '');
    console.log(`  npx tsx scripts/cleanup-bogus-compare-at.ts --csv=${rel} --apply`);
    return;
  }

  if (rows.length === 0) {
    console.log('Nothing to apply.');
    return;
  }

  let updated = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await updateMarketplaceVariantPriceRest({
        variantIdNumeric: row.variantIdNumeric,
        price: row.price,
        compareAtPrice: null,
      });
      updated += 1;
      if (updated % 25 === 0) console.log(`  cleared ${updated}/${rows.length}…`);
    } catch (err) {
      failed += 1;
      console.error(
        `  FAIL ${row.productHandle} ${row.variantIdNumeric}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`\nDone. Cleared compare_at on ${updated} variant(s); ${failed} failed.`);
  console.log('Shopify may take a few minutes to drop products from the automated on-sale collection.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
