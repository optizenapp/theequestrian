#!/usr/bin/env tsx
/**
 * Retire WA Dog Grooming Supplies brand hubs from the storefront.
 *
 * Exclusive hubs only (Luxe Pet / Kindly Tail / Pet Food Australia are shared and kept).
 *
 *   npx tsx scripts/retire-wa-dog-brands.ts --floral-prod
 *   npx tsx scripts/retire-wa-dog-brands.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';

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

import { neon } from '@neondatabase/serverless';

const VENDOR = 'WA Dog Grooming Supplies';

/** Exclusive to WA Dog — unpublish + block. Do not include luxe-pet / kindly-tail. */
const EXCLUSIVE_HUBS = [
  'igroom',
  'progroom',
  'furex',
  'plush-puppy',
  'melanie-newman',
  'natures-specialties',
  'wa-dog-grooming-supplies',
] as const;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function revalidatePaths(paths: string[]): Promise<void> {
  const base = (process.env.REVALIDATE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(
    /\/$/,
    ''
  );
  const secret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET || '';
  if (!base || !secret) {
    console.log('[revalidate] Skip — missing site URL or secret');
    return;
  }
  for (const path of paths) {
    try {
      const res = await fetch(`${base}/api/internal/revalidate-collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ path }),
      });
      const text = await res.text();
      console.log(`[revalidate] ${path} → ${res.status} ${text.slice(0, 120)}`);
    } catch (e) {
      console.log(`[revalidate] ${path} failed:`, (e as Error).message);
    }
  }
}

async function main(): Promise<void> {
  const apply = hasFlag('--apply');
  const floral = hasFlag('--floral-prod');
  if (!floral) {
    console.error('Refusing to run without --floral-prod (production Neon).');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('DATABASE_URL required');
  const sql = neon(dbUrl);

  console.log(`Retire WA Dog brands — mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  for (const hub of EXCLUSIVE_HUBS) {
    const rows = (await sql`
      SELECT handle, title, status, COALESCE(products_count, 0)::int AS products_count
      FROM brand_content WHERE handle = ${hub} LIMIT 1
    `) as Array<{
      handle: string;
      title: string;
      status: string | null;
      products_count: number;
    }>;

    if (!rows[0]) {
      console.log(`${hub}: no brand_content row`);
      continue;
    }

    const row = rows[0];
    console.log(
      `${hub}: ${row.status} count=${row.products_count} "${row.title}" → draft + products_count=0`
    );

    if (apply) {
      await sql`
        UPDATE brand_content
        SET status = 'draft',
            products_count = 0,
            updated_at = NOW()
        WHERE handle = ${hub}
      `;
      console.log(`  updated`);
    }
  }

  const before = (await sql`
    SELECT
      count(*)::int AS n,
      count(*) FILTER (WHERE available_for_sale IS TRUE)::int AS avail
    FROM products
    WHERE lower(trim(vendor)) = lower(${VENDOR})
  `) as Array<{ n: number; avail: number }>;

  console.log(
    `\nNeon WA Dog products: ${before[0]?.n ?? 0} (available_for_sale=true: ${before[0]?.avail ?? 0})`
  );
  console.log(`  → set available_for_sale=false for all vendor rows`);

  if (apply) {
    const updated = (await sql`
      UPDATE products
      SET available_for_sale = false,
          updated_at = NOW()
      WHERE lower(trim(vendor)) = lower(${VENDOR})
        AND (available_for_sale IS DISTINCT FROM false)
      RETURNING handle
    `) as Array<{ handle: string }>;
    console.log(`  cleared availability on ${updated.length} products`);
  }

  if (apply) {
    const paths = [
      '/brands',
      ...EXCLUSIVE_HUBS.map((h) => `/brands/${h}`),
      '/pet',
    ];
    await revalidatePaths(paths);
  } else {
    console.log('\nDry run only — pass --apply to write.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
