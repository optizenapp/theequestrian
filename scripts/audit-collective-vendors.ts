#!/usr/bin/env tsx
/**
 * Audit Shopify vendors vs Shopify Collective tag; compare Neon vendor mix.
 * Usage: npx tsx scripts/audit-collective-vendors.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

type ProductRow = { handle: string; vendor: string; status: string; tags: string[] };

async function fetchAllProducts(): Promise<ProductRow[]> {
  const out: ProductRow[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: ProductRow }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: `query($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges { node { handle vendor status tags } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: { first: 250, after: cursor },
      cache: 'no-store',
    });
    for (const { node } of data.products.edges) out.push(node);
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}

function isCollective(tags: string[]): boolean {
  return tags.some((t) => t.toLowerCase() === 'shopify collective');
}

async function main(): Promise<void> {
  const products = await fetchAllProducts();
  console.log(`Shopify products: ${products.length}`);

  const byVendor = new Map<
    string,
    { total: number; collective: number; nonCollective: number; statuses: Map<string, number> }
  >();

  for (const p of products) {
    const vendor = (p.vendor || '').trim() || '(blank)';
    const row = byVendor.get(vendor) || {
      total: 0,
      collective: 0,
      nonCollective: 0,
      statuses: new Map(),
    };
    row.total += 1;
    if (isCollective(p.tags)) row.collective += 1;
    else row.nonCollective += 1;
    row.statuses.set(p.status, (row.statuses.get(p.status) || 0) + 1);
    byVendor.set(vendor, row);
  }

  console.log('\nShopify vendors:');
  for (const [vendor, s] of [...byVendor.entries()].sort((a, b) => b[1].total - a[1].total)) {
    const st = [...s.statuses.entries()].map(([k, v]) => `${k}:${v}`).join(',');
    console.log(
      `  ${s.total}\t${vendor}\tcollective=${s.collective}\tnonCollective=${s.nonCollective}\t[${st}]`
    );
  }

  const nonCollByVendor = new Map<string, number>();
  for (const p of products.filter((p) => !isCollective(p.tags))) {
    const v = (p.vendor || '').trim() || '(blank)';
    nonCollByVendor.set(v, (nonCollByVendor.get(v) || 0) + 1);
  }
  console.log('\nNon-Collective tagged products by vendor:');
  for (const [v, c] of [...nonCollByVendor.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}\t${v}`);
  }

  const runaway = products.filter(
    (p) => /runaway/i.test(p.vendor) || p.tags.some((t) => /runaway/i.test(t))
  );
  console.log(`\nRunaway-related: ${runaway.length}`);
  for (const p of runaway.slice(0, 20)) {
    console.log(
      `  [${p.status}] vendor=${p.vendor} collective=${isCollective(p.tags)} ${p.handle}`
    );
  }

  if (hasFlag('--floral-prod')) {
    const sql = neon(FLORAL);
    const db = await sql`
      SELECT COALESCE(NULLIF(TRIM(vendor), ''), '(blank)') AS vendor, COUNT(*)::int AS c
      FROM products
      GROUP BY 1
      ORDER BY c DESC
    `;
    console.log('\nNeon vendors:');
    for (const r of db) console.log(`  ${r.c}\t${r.vendor}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
