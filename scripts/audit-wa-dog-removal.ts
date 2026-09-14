#!/usr/bin/env tsx
/**
 * Audit WA Dog Grooming Supplies for storefront removal.
 * Dry-run inventory: Shopify status + Neon brands + exclusivity of hubs.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL;
  process.env.POSTGRES_URL = FLORAL;
  process.env.DATABASE_URL = FLORAL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { neon } from '@neondatabase/serverless';

const VENDOR = 'WA Dog Grooming Supplies';

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  status: string;
  tags: string[];
};

async function fetchShopifyVendorProducts(): Promise<ProductNode[]> {
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
      query: `query($first: Int!, $after: String, $query: String!) {
        products(first: $first, after: $after, query: $query) {
          edges { node { id handle title vendor status tags } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: {
        first: 100,
        after: cursor,
        query: `vendor:"${VENDOR}"`,
      },
    });
    for (const { node } of data.products.edges) out.push(node);
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('DATABASE_URL required');
  const sql = neon(dbUrl);

  console.log(`\nAuditing vendor: ${VENDOR}\n`);
  const shopify = await fetchShopifyVendorProducts();
  const byStatus = new Map<string, number>();
  for (const p of shopify) {
    byStatus.set(p.status, (byStatus.get(p.status) || 0) + 1);
  }
  console.log(`Shopify products: ${shopify.length}`);
  for (const [s, n] of [...byStatus.entries()].sort()) console.log(`  ${s}: ${n}`);

  const neonRows = (await sql`
    SELECT
      handle,
      title,
      vendor,
      brand,
      brand_hub_handle,
      available_for_sale
    FROM products
    WHERE lower(trim(vendor)) = lower(${VENDOR})
    ORDER BY brand NULLS LAST, handle
  `) as Array<{
    handle: string;
    title: string | null;
    vendor: string | null;
    brand: string | null;
    brand_hub_handle: string | null;
    available_for_sale: boolean | null;
  }>;

  console.log(`\nNeon products: ${neonRows.length}`);
  const byBrand = new Map<string, number>();
  const byHub = new Map<string, number>();
  for (const r of neonRows) {
    const key = r.brand?.trim() || '(none)';
    byBrand.set(key, (byBrand.get(key) || 0) + 1);
    const hub = (r.brand_hub_handle || '').trim() || '(none)';
    byHub.set(hub, (byHub.get(hub) || 0) + 1);
  }
  console.log('By brand:');
  for (const [k, n] of [...byBrand.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${k}`);
  }
  console.log('By brand_hub_handle:');
  for (const [k, n] of [...byHub.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${k}`);
  }

  const { slugFromBrandName } = await import('@/lib/brands/brand-slug');
  const hubs = [
    ...new Set(
      [
        ...[...byHub.keys()].filter((h) => h !== '(none)'),
        ...[...byBrand.keys()]
          .filter((b) => b !== '(none)')
          .map((b) => slugFromBrandName(b)),
      ].filter(Boolean)
    ),
  ];

  console.log('\nHub exclusivity:');
  const exclusive: string[] = [];
  const shared: Array<{ hub: string; wa: number; other: number }> = [];

  for (const hub of hubs.sort()) {
    const exact = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE lower(trim(vendor)) = lower(${VENDOR}))::int AS wa,
        COUNT(*) FILTER (WHERE lower(trim(vendor)) <> lower(${VENDOR}))::int AS other
      FROM products
      WHERE brand_hub_handle = ${hub}
         OR lower(regexp_replace(trim(coalesce(brand, '')), '[^a-z0-9]+', '', 'g'))
            = lower(regexp_replace(${hub}, '[^a-z0-9]+', '', 'g'))
    `) as Array<{ wa: number; other: number }>;

    const wa = exact[0]?.wa ?? 0;
    const other = exact[0]?.other ?? 0;
    const bc = (await sql`
      SELECT handle, title, status, COALESCE(products_count, 0)::int AS products_count
      FROM brand_content WHERE handle = ${hub} LIMIT 1
    `) as Array<{
      handle: string;
      title: string;
      status: string | null;
      products_count: number;
    }>;

    const hubMeta = bc[0]
      ? `${bc[0].status || '?'} count=${bc[0].products_count} "${bc[0].title}"`
      : 'NO brand_content row';

    console.log(
      `  ${hub.padEnd(28)} wa=${String(wa).padStart(4)} other=${String(other).padStart(4)}  ${hubMeta}`
    );
    if (other === 0 && wa > 0 && bc[0]) exclusive.push(hub);
    else if (wa > 0 && other > 0) shared.push({ hub, wa, other });
  }

  const guessHandles = [
    'igroom',
    'progroom',
    'furex',
    'luxe-pet',
    'plush-puppy',
    'melanie-newman',
    'natures-specialties',
    'kindly-tail',
    'wa-dog-grooming-supplies',
  ];
  console.log('\nKnown candidate hubs in brand_content:');
  for (const h of guessHandles) {
    const bc = (await sql`
      SELECT handle, title, status, COALESCE(products_count, 0)::int AS products_count
      FROM brand_content WHERE handle = ${h} LIMIT 1
    `) as Array<{
      handle: string;
      title: string;
      status: string | null;
      products_count: number;
    }>;
    if (!bc[0]) {
      console.log(`  ${h}: (no row)`);
      continue;
    }
    const exact = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE lower(trim(vendor)) = lower(${VENDOR}))::int AS wa,
        COUNT(*) FILTER (WHERE lower(trim(vendor)) <> lower(${VENDOR}))::int AS other
      FROM products
      WHERE brand_hub_handle = ${h}
         OR handle LIKE ${h + '-%'}
         OR lower(regexp_replace(trim(coalesce(brand, '')), '[^a-z0-9]+', '', 'g'))
            = lower(regexp_replace(${h}, '[^a-z0-9]+', '', 'g'))
    `) as Array<{ wa: number; other: number }>;
    console.log(
      `  ${h}: ${bc[0].status} count=${bc[0].products_count} wa=${exact[0]?.wa ?? 0} other=${exact[0]?.other ?? 0}`
    );
    if ((exact[0]?.wa ?? 0) > 0 && (exact[0]?.other ?? 0) === 0 && !exclusive.includes(h)) {
      exclusive.push(h);
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(process.cwd(), `exports/wa-dog-removal-audit-${stamp}.json`);
  const payload = {
    vendor: VENDOR,
    shopify: {
      total: shopify.length,
      byStatus: Object.fromEntries(byStatus),
      stillActive: shopify.filter((p) => p.status === 'ACTIVE').map((p) => p.handle),
    },
    neon: {
      total: neonRows.length,
      byBrand: Object.fromEntries(byBrand),
      byHub: Object.fromEntries(byHub),
    },
    exclusiveHubs: [...new Set(exclusive)].sort(),
    sharedHubs: shared,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nExclusive hubs to retire: ${payload.exclusiveHubs.join(', ') || '(none)'}`);
  console.log(`Shared hubs (do not unpublish): ${shared.map((s) => s.hub).join(', ') || '(none)'}`);
  console.log(`Wrote ${outPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
