#!/usr/bin/env tsx
/**
 * Find category-leaf-prune / thin-leaf-followup 301s whose from_path now has
 * product allocations, then deactivate those redirects and republish the leaf.
 *
 *   npx tsx scripts/unprune-categories-with-products.ts --floral-prod
 *   npx tsx scripts/unprune-categories-with-products.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });

const FLORAL_WIND_POOLER = 'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';
const TOP_LEVEL = new Set(['horse', 'rider', 'clothing', 'pet', 'accessories']);
const PRUNE_SOURCES = ['category-leaf-prune', 'thin-leaf-followup'];

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) throw new Error('POSTGRES_PASSWORD required for --floral-prod');
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  return cs;
}

function normalizePath(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function isCategoryPlpPath(path: string): boolean {
  const parts = normalizePath(path).split('/').filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return false;
  return TOP_LEVEL.has(parts[0]);
}

type RedirectRow = {
  from_path: string;
  to_path: string;
  source: string;
  status: string;
};

type CountRow = { exact: number; rollup: number };
type ContentRow = { url_path: string; status: string };

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const sql = neon(resolveConnectionString());
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const redirects = (await sql`
    SELECT from_path, to_path, source, status
    FROM manual_redirects
    WHERE status IN ('active', 'override')
      AND source = ANY(${PRUNE_SOURCES})
    ORDER BY from_path
  `) as unknown as RedirectRow[];

  const categoryRedirects = redirects.filter((row) => isCategoryPlpPath(row.from_path));
  console.log(`Active prune redirects: ${redirects.length} (category PLPs: ${categoryRedirects.length})`);

  const contentRows = (await sql`
    SELECT url_path, status FROM collection_content
  `) as unknown as ContentRow[];
  const contentByPath = new Map(
    contentRows.map((row) => [normalizePath(row.url_path), row.status])
  );

  const stale: Array<RedirectRow & CountRow & { contentStatus: string }> = [];

  for (const row of categoryRedirects) {
    const path = normalizePath(row.from_path);
    const counts = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE pca.category_path = ${path})::int AS exact,
        COUNT(*)::int AS rollup
      FROM product_category_assignments pca
      WHERE pca.category_path = ${path} OR pca.category_path LIKE ${path + '/%'}
    `) as unknown as CountRow[];
    const exact = Number(counts[0]?.exact || 0);
    const rollup = Number(counts[0]?.rollup || 0);
    if (exact <= 0 && rollup <= 0) continue;
    stale.push({
      ...row,
      from_path: path,
      exact,
      rollup,
      contentStatus: contentByPath.get(path) || '(none)',
    });
  }

  console.log(`Stale (now have products): ${stale.length}\n`);
  for (const row of stale) {
    console.log(
      `${row.from_path} → ${row.to_path}  exact=${row.exact} rollup=${row.rollup} content=${row.contentStatus} (${row.source})`
    );
  }

  if (!apply) {
    console.log('\nDry run — pass --apply to deactivate redirects and republish leaves.');
    return;
  }

  if (stale.length === 0) {
    console.log('Nothing to apply.');
    return;
  }

  const paths = stale.map((row) => row.from_path);
  const deactivated = await sql`
    UPDATE manual_redirects
    SET status = 'inactive', updated_at = NOW()
    WHERE from_path = ANY(${paths})
      AND status IN ('active', 'override')
    RETURNING from_path
  `;
  console.log(`\nDeactivated redirects: ${deactivated.length}`);

  const published = await sql`
    UPDATE collection_content
    SET status = 'published', updated_at = NOW()
    WHERE url_path = ANY(${paths})
      AND status <> 'published'
    RETURNING url_path
  `;
  console.log(`Republished collection_content: ${published.length}`);
  for (const row of published as Array<{ url_path: string }>) {
    console.log(`  published ${row.url_path}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
