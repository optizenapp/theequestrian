#!/usr/bin/env tsx
/**
 * Consolidate stirrup-irons → /horse/tack/stirrups
 *
 * - Republish /horse/tack/stirrups
 * - Move allocations from /horse/tack/stirrup-irons (+ review CSV stirrup targets)
 * - 301 /horse/tack/stirrup-irons → /horse/tack/stirrups
 * - Point collection_mapping rows at stirrups
 *
 * Usage:
 *   npx tsx scripts/consolidate-stirrups.ts --floral-prod
 *   npx tsx scripts/consolidate-stirrups.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const FROM = '/horse/tack/stirrup-irons';
const TO = '/horse/tack/stirrups';

type AllocRow = {
  product_id: string;
  product_handle: string;
  canonical_path: string;
  category_path: string;
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

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate stirrups');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`  ${FROM} → ${TO}\n`);

  const contentTo = (await sql`
    SELECT url_path, status, h1_title, parent_url, category_level
    FROM collection_content WHERE url_path = ${TO}
  `) as Array<Record<string, string | number | null>>;
  const contentFrom = (await sql`
    SELECT url_path, status, h1_title
    FROM collection_content WHERE url_path = ${FROM}
  `) as Array<Record<string, string | null>>;

  console.log('Content TO:', contentTo[0] || '(missing)');
  console.log('Content FROM:', contentFrom[0] || '(missing)');

  const fromAllocs = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE category_path = ${FROM}
    ORDER BY product_handle
  `) as unknown as AllocRow[];

  // Also catch review targets already pointing at stirrups but still elsewhere,
  // and products in stirrup-leathers that are actually stirrup irons (from review).
  const reviewHandles = [
    'equi-wing-nylon-stirrups',
    'tech-stirrups-siena',
    'waldhausen-stirrup-covers',
  ];
  const extra = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE product_handle = ANY(${reviewHandles})
      AND category_path IS DISTINCT FROM ${TO}
    ORDER BY product_handle
  `) as unknown as AllocRow[];

  const byId = new Map<string, AllocRow>();
  for (const row of [...fromAllocs, ...extra]) byId.set(row.product_id, row);
  const toMove = [...byId.values()];

  console.log(`\nAllocations on ${FROM}: ${fromAllocs.length}`);
  console.log(`Extra review handles to move: ${extra.length}`);
  console.log(`Total unique to move → ${TO}: ${toMove.length}`);
  for (const row of toMove) {
    console.log(`  ${row.product_handle}  (${row.category_path})`);
  }

  const mappingFrom = (await sql`
    SELECT id, product_type, action, top_level, parent_category, subcategory_handle
    FROM collection_mapping
    WHERE top_level = 'horse'
      AND parent_category = 'tack'
      AND subcategory_handle = 'stirrup-irons'
  `) as Array<Record<string, string | number>>;
  console.log(`\nMapping rows on stirrup-irons: ${mappingFrom.length}`);

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

  // Republish / create TO content
  if (contentTo.length) {
    await sql`
      UPDATE collection_content
      SET status = 'published',
          parent_url = '/horse/tack',
          category_level = 3,
          h1_title = COALESCE(NULLIF(h1_title, ''), 'Stirrups'),
          breadcrumb_label = COALESCE(NULLIF(breadcrumb_label, ''), 'Stirrups'),
          updated_at = NOW()
      WHERE url_path = ${TO}
    `;
    console.log(`Published ${TO}`);
  } else {
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
      ) VALUES (
        ${TO}, 'Stirrups', 'Stirrups', '/horse/tack', 3, 'published', NOW()
      )
    `;
    console.log(`Created + published ${TO}`);
  }

  // Draft FROM content if present
  if (contentFrom.length) {
    await sql`
      UPDATE collection_content
      SET status = 'draft', updated_at = NOW()
      WHERE url_path = ${FROM}
    `;
    console.log(`Drafted ${FROM}`);
  }

  // Move allocations
  for (const row of toMove) {
    const newCanonical = normalizePath(`${TO}/${row.product_handle}`);
    await sql`
      UPDATE product_category_assignments
      SET canonical_path = ${newCanonical},
          category_path = ${TO},
          top_level = 'horse',
          parent_category = 'tack',
          subcategory_handle = 'stirrups',
          updated_at = NOW()
      WHERE product_id = ${row.product_id}
    `;
    if (row.canonical_path !== newCanonical) {
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-stirrups', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'consolidate-stirrups',
            status = 'active',
            updated_at = NOW()
      `;
    }
  }
  console.log(`Moved ${toMove.length} allocations`);

  // Category redirect
  await sql`
    INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
    VALUES (${FROM}, ${TO}, '301', 'consolidate-stirrups', 'active', NOW())
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = '301',
        source = 'consolidate-stirrups',
        status = 'active',
        updated_at = NOW()
  `;
  console.log(`Redirect ${FROM} → ${TO}`);

  // Remap mapping rows: change subcategory_handle iron → stirrups
  // Avoid unique conflicts by updating only when no identical stirrups row exists
  for (const row of mappingFrom) {
    const conflict = (await sql`
      SELECT id FROM collection_mapping
      WHERE top_level = 'horse'
        AND parent_category = 'tack'
        AND subcategory_handle = 'stirrups'
        AND product_type = ${row.product_type as string}
      LIMIT 1
    `) as Array<{ id: number }>;

    if (conflict.length) {
      await sql`
        UPDATE collection_mapping
        SET action = 'exclude',
            notes = COALESCE(notes, '') || ' [excluded: duplicate after consolidate-stirrups]',
            updated_at = NOW()
        WHERE id = ${row.id as number}
      `;
    } else {
      await sql`
        UPDATE collection_mapping
        SET subcategory_handle = 'stirrups',
            updated_at = NOW()
        WHERE id = ${row.id as number}
      `;
    }
  }
  console.log(`Updated ${mappingFrom.length} mapping rows`);

  const finalCount = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${TO}
  `) as Array<{ c: number }>;
  const leftBehind = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${FROM}
  `) as Array<{ c: number }>;

  console.log(`\nDone. ${TO} count=${finalCount[0]?.c || 0}; ${FROM} left=${leftBehind[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
