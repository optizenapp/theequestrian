#!/usr/bin/env tsx
/**
 * Dry-run / apply delete for legacy DRAFT non-Collective vendors.
 *
 * Default vendors: Shire Saddleworld, Southern Sport Horses, Pet House, Sterling Essentials
 *
 * Safety: only DRAFT + no "Shopify Collective" tag. Skips Runaway / Collective.
 *
 * Usage:
 *   npx tsx scripts/delete-draft-legacy-vendors.ts --floral-prod --dry-run
 *   npx tsx scripts/delete-draft-legacy-vendors.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getArg, hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const DEFAULT_VENDORS = [
  'Shire Saddleworld',
  'Southern Sport Horses',
  'Pet House',
  'Sterling Essentials',
];

type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  status: string;
  vendor: string;
  tags: string[];
};

function isCollective(tags: string[]): boolean {
  return tags.some((t) => t.toLowerCase() === 'shopify collective');
}

async function fetchVendorProducts(vendor: string): Promise<ShopifyProduct[]> {
  const out: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  const q = `vendor:"${vendor}"`;

  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: ShopifyProduct }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: `query($q: String!, $first: Int!, $after: String) {
        products(first: $first, after: $after, query: $q) {
          edges { node { id handle title status vendor tags } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: { q, first: 250, after: cursor },
      cache: 'no-store',
    });
    for (const { node } of data.products.edges) out.push(node);
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}

async function deleteShopifyProduct(id: string): Promise<string | null> {
  const data = await shopifyAdminFetch<{
    productDelete: { deletedProductId: string | null; userErrors: Array<{ message: string }> };
  }>({
    query: `mutation($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { message }
      }
    }`,
    variables: { input: { id } },
    cache: 'no-store',
  });
  const errors = data.productDelete.userErrors.map((e) => e.message).join('; ');
  return errors || null;
}

async function main(): Promise<void> {
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const vendorsArg = getArg('--vendors');
  const vendors = vendorsArg
    ? vendorsArg.split('|').map((v) => v.trim()).filter(Boolean)
    : DEFAULT_VENDORS;

  if (hasFlag('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database (ep-floral-wind)\n');
  }

  console.log(`Delete draft legacy vendors — ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Vendors: ${vendors.join(' | ')}\n`);

  const planned: ShopifyProduct[] = [];
  const skipped: Array<{ handle: string; vendor: string; reason: string }> = [];

  for (const vendor of vendors) {
    const products = await fetchVendorProducts(vendor);
    console.log(`${vendor}: ${products.length} in Shopify`);
    for (const p of products) {
      if (p.status !== 'DRAFT') {
        skipped.push({ handle: p.handle, vendor: p.vendor, reason: `status=${p.status}` });
        continue;
      }
      if (isCollective(p.tags)) {
        skipped.push({ handle: p.handle, vendor: p.vendor, reason: 'Shopify Collective tag' });
        continue;
      }
      if (/runaway/i.test(p.vendor)) {
        skipped.push({ handle: p.handle, vendor: p.vendor, reason: 'Runaway protected' });
        continue;
      }
      planned.push(p);
    }
  }

  const byVendor = new Map<string, number>();
  for (const p of planned) {
    byVendor.set(p.vendor, (byVendor.get(p.vendor) || 0) + 1);
  }

  console.log(`\nPlanned deletes: ${planned.length}`);
  for (const [v, c] of [...byVendor.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}\t${v}`);
  }
  console.log(`Skipped: ${skipped.length}`);
  for (const s of skipped.slice(0, 20)) {
    console.log(`  skip ${s.handle} (${s.vendor}): ${s.reason}`);
  }
  if (skipped.length > 20) console.log(`  ... +${skipped.length - 20} more skips`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = resolve(process.cwd(), `exports/draft-legacy-delete-plan-${stamp}.csv`);
  const lines = [
    'action,vendor,status,handle,title,id,tags',
    ...planned.map((p) =>
      ['DELETE', p.vendor, p.status, p.handle, p.title.replace(/"/g, '""'), p.id, p.tags.join('|')]
        .map((v) => `"${v}"`)
        .join(',')
    ),
    ...skipped.map((s) =>
      ['SKIP', s.vendor, '', s.handle, s.reason, '', '']
        .map((v) => `"${v}"`)
        .join(',')
    ),
  ];
  writeFileSync(csvPath, lines.join('\n'));
  console.log(`\nWrote ${csvPath}`);

  // Neon overlap
  const sql = neon(process.env.CUSTOM_DATABASE_URL || process.env.POSTGRES_URL || FLORAL);
  const handles = planned.map((p) => p.handle);
  let neonHits = 0;
  const CHUNK = 500;
  for (let i = 0; i < handles.length; i += CHUNK) {
    const chunk = handles.slice(i, i + CHUNK);
    const rows = await sql`
      SELECT COUNT(*)::int AS c FROM products WHERE handle = ANY(${chunk})
    `;
    neonHits += rows[0]?.c ?? 0;
  }
  console.log(`Neon products matching planned handles: ${neonHits}`);

  if (dryRun) {
    console.log('\nDry run only — pass --apply to delete from Shopify (then purge Neon orphans).');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < planned.length; i++) {
    const p = planned[i];
    const err = await deleteShopifyProduct(p.id);
    if (err) {
      fail += 1;
      console.log(`FAIL ${p.handle}: ${err}`);
    } else {
      ok += 1;
    }
    if ((i + 1) % 50 === 0 || i + 1 === planned.length) {
      console.log(`  shopify deleted ${ok}/${planned.length} (fail=${fail})`);
    }
  }
  console.log(`\nShopify delete done: ok=${ok} fail=${fail}`);
  console.log('Next: npx tsx scripts/purge-orphan-products.ts --floral-prod --apply');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
