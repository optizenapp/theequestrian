#!/usr/bin/env tsx
/**
 * Keep /horse/supplements as master: move review items + supplements
 * currently under /horse/veterinary into it.
 *
 * Usage:
 *   npx tsx scripts/consolidate-horse-supplements.ts --floral-prod
 *   npx tsx scripts/consolidate-horse-supplements.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/horse/supplements';

type Candidate = {
  product_id: string;
  handle: string;
  title: string;
  product_type: string | null;
  category_path: string | null;
  canonical_path: string | null;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

function looksLikeSupplement(row: Candidate): boolean {
  const title = (row.title || '').toLowerCase();
  const handle = (row.handle || '').toLowerCase();
  const type = (row.product_type || '').toLowerCase();
  const hay = `${title} ${handle} ${type}`;

  const signal =
    /\bsupplement/.test(hay) ||
    type.includes('supplement') ||
    /\belectrolyte/.test(hay) ||
    /\bbiotin\b/.test(hay) ||
    /\bmsm\b/.test(hay) ||
    /\bpsyllium\b/.test(hay) ||
    /\bjoint formula\b/.test(hay) ||
    /\bprobiotic/.test(hay) ||
    /\bprebiotic/.test(hay) ||
    /\bvitamin/.test(hay) ||
    /\bmineral salt\b/.test(hay) ||
    /\bsalt block\b/.test(hay) ||
    /\bred hot paste\b/.test(hay) ||
    handle.includes('mineral-salt') ||
    handle.includes('red-hot-paste') ||
    handle.includes('b-quiet') ||
    handle.includes('gastroaid') ||
    handle.includes('recovery-aid');

  const exclude =
    /\bbandage\b/.test(hay) ||
    /\bdressing\b/.test(hay) ||
    /\bwound\b/.test(hay) ||
    /\bsaline\b/.test(hay) ||
    /\bgauze\b/.test(hay) ||
    /\bantiseptic spray\b/.test(hay) ||
    /\bfly spray\b/.test(hay) ||
    /\bshampoo\b/.test(hay) ||
    /\bcleaner\b/.test(hay) ||
    /\bhoof oil\b/.test(hay) ||
    /\bhoof polish\b/.test(hay);

  return signal && !exclude;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate horse supplements → /horse/supplements');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const reviewHandles = ['007-mineral-salt-blocks', 'kelato-red-hot-paste-1'];

  // Products under veterinary that look like supplements + explicit review handles
  const vetProducts = (await sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.product_type,
      pca.category_path,
      pca.canonical_path
    FROM products p
    INNER JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE pca.category_path = '/horse/veterinary'
       OR pca.category_path LIKE '/horse/veterinary/%'
       OR p.handle = ANY(${reviewHandles})
    ORDER BY p.handle
  `) as unknown as Candidate[];

  const matches = vetProducts.filter(
    (row) =>
      reviewHandles.includes(row.handle) || looksLikeSupplement(row)
  );
  const toMove = matches.filter(
    (m) => normalizePath(m.category_path || '') !== PATH
  );

  console.log(`Veterinary/review candidates scanned: ${vetProducts.length}`);
  console.log(`Matched as supplements to move: ${toMove.length}\n`);
  for (const row of toMove) {
    console.log(`  ${row.handle} | ${row.category_path} | ${row.title}`);
  }

  if (dryRun) {
    console.log('\nDry run — pass --apply to write.');
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS manual_redirects (
      id SERIAL PRIMARY KEY,
      from_path TEXT UNIQUE NOT NULL,
      to_path TEXT NOT NULL,
      redirect_type TEXT NOT NULL DEFAULT '301',
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'active',
      conflict_target TEXT,
      last_checked TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Ensure /horse/supplements stays published
  await sql`
    UPDATE collection_content
    SET status = 'published', updated_at = NOW()
    WHERE url_path = ${PATH}
  `;

  let moved = 0;
  for (const row of toMove) {
    const newCanonical = normalizePath(`${PATH}/${row.handle}`);
    await sql`
      UPDATE product_category_assignments
      SET canonical_path = ${newCanonical},
          category_path = ${PATH},
          top_level = 'horse',
          parent_category = 'supplements',
          subcategory_handle = NULL,
          updated_at = NOW()
      WHERE product_id = ${row.product_id}
    `;
    if (row.canonical_path && row.canonical_path !== newCanonical) {
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-horse-supplements', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'consolidate-horse-supplements',
            status = 'active',
            updated_at = NOW()
      `;
    }
    moved += 1;
    console.log(`Moved ${row.handle}`);
  }

  const final = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${PATH}
  `) as Array<{ c: number }>;
  const vetLeft = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = '/horse/veterinary'
  `) as Array<{ c: number }>;

  console.log(`\nDone. moved=${moved}; ${PATH}=${final[0]?.c || 0}; /horse/veterinary left=${vetLeft[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
