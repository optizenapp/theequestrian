#!/usr/bin/env tsx
/**
 * Refresh brand_content.products_count for every published hub using the same
 * product-match rules as /brands/[handle] (OR of brand_content.rules).
 *
 *   npx tsx scripts/refresh-brand-index-counts.ts --floral-prod
 *   npx tsx scripts/refresh-brand-index-counts.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { stringify } from 'csv-stringify/sync';
import { writeFileSync } from 'fs';
import { hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL;
  process.env.POSTGRES_URL = FLORAL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

async function revalidateBrandsIndex(): Promise<void> {
  const base = (process.env.REVALIDATE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(
    /\/$/,
    ''
  );
  const secret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET || '';
  if (!base || !secret) {
    console.log('[revalidate] Skip /brands — missing site URL or secret');
    return;
  }
  try {
    const res = await fetch(`${base}/api/internal/revalidate-collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ path: '/brands' }),
    });
    const text = await res.text();
    console.log('[revalidate]', res.status, text.slice(0, 200));
  } catch (error) {
    console.warn('[revalidate]', error instanceof Error ? error.message : error);
  }
}

async function main(): Promise<void> {
  const apply = hasFlag('--apply');
  const { sql } = await import('@/lib/db/client');
  const { getAllPublishedBrandContent, invalidateBrandContentCache } = await import(
    '@/lib/content/brand-content'
  );
  const { countDbProductsForBrand } = await import('@/lib/brands/get-brand-products');

  const brands = await getAllPublishedBrandContent();
  console.log(`Published brands: ${brands.length}  mode=${apply ? 'APPLY' : 'AUDIT'}\n`);

  const diffs: Array<{
    handle: string;
    title: string;
    stored: number;
    actual: number;
    delta: number;
  }> = [];

  for (let i = 0; i < brands.length; i += 1) {
    const brand = brands[i];
    const actual = await countDbProductsForBrand(brand);
    const stored = brand.products_count ?? 0;
    if (actual !== stored) {
      diffs.push({
        handle: brand.handle,
        title: brand.title,
        stored,
        actual,
        delta: actual - stored,
      });
    }
    if ((i + 1) % 50 === 0) console.log(`  … ${i + 1}/${brands.length}`);
  }

  diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  console.log(`Mismatches: ${diffs.length}`);
  for (const row of diffs.slice(0, 40)) {
    console.log(`  ${row.handle}\t${row.stored} → ${row.actual} (${row.delta > 0 ? '+' : ''}${row.delta})`);
  }
  if (diffs.length > 40) console.log(`  … ${diffs.length - 40} more`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = resolve(process.cwd(), `exports/brand-index-count-audit-${stamp}.csv`);
  writeFileSync(csvPath, stringify(diffs, { header: true }));
  console.log(`\nWrote ${csvPath}`);

  if (!apply) {
    console.log('\nDry audit. Re-run with --apply to write products_count.');
    return;
  }

  let updated = 0;
  for (const row of diffs) {
    await sql`
      UPDATE brand_content
      SET products_count = ${row.actual}, updated_at = NOW()
      WHERE handle = ${row.handle}
    `;
    updated += 1;
  }
  invalidateBrandContentCache();
  console.log(`Updated products_count on ${updated} brand hubs`);
  await revalidateBrandsIndex();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
