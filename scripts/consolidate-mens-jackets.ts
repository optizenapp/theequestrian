#!/usr/bin/env tsx
/**
 * Create /clothing/mens/jackets and move men's casual (non-show) jackets there.
 *
 * Usage:
 *   npx tsx scripts/consolidate-mens-jackets.ts --floral-prod
 *   npx tsx scripts/consolidate-mens-jackets.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/clothing/mens/jackets';
const SHOW_PATH = '/clothing/mens/show-jackets';

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

function isMensSignal(hay: string, path: string): boolean {
  return (
    /\bmens?\b/.test(hay) ||
    /\bmen's\b/.test(hay) ||
    /\bman's\b/.test(hay) ||
    path.startsWith('/clothing/mens') ||
    hay.includes("men's clothing")
  );
}

function isJacket(hay: string): boolean {
  return (
    /\bjacket\b/.test(hay) ||
    /\bbomber\b/.test(hay) ||
    /\bpuffer\b/.test(hay) ||
    /\bsoftshell\b/.test(hay) ||
    /\bhoodie\b/.test(hay) === false && /\bparkas?\b/.test(hay)
  );
}

function isShowCompetition(hay: string, path: string): boolean {
  return (
    path === SHOW_PATH ||
    path === '/clothing/outerwear/show-jackets' ||
    path === '/clothing/outerwear/riding-jackets' ||
    /\bshow jacket\b/.test(hay) ||
    /\bcompetition jacket\b/.test(hay) ||
    /\briding jacket\b/.test(hay) ||
    /\bcomp jacket\b/.test(hay) ||
    /\btails\b/.test(hay) ||
    /\bfrack\b/.test(hay)
  );
}

function looksLikeMensCasualJacket(row: Candidate): boolean {
  const title = (row.title || '').toLowerCase();
  const handle = (row.handle || '').toLowerCase();
  const type = (row.product_type || '').toLowerCase();
  const path = normalizePath(row.category_path || '').toLowerCase();
  const hay = `${title} ${handle} ${type}`;

  if (!isJacket(hay) && !/\bbomber\b/.test(hay) && !/\bpuffer\b/.test(hay) && !/\bsoftshell\b/.test(hay)) {
    // jacket-like words
    if (!/\bjacket/.test(hay) && !/\bbomber/.test(hay)) return false;
  }
  if (!/\bjacket|\bbomber|\bpuffer|\bsoftshell|\bparkas?/.test(hay)) return false;
  // Vests are not jackets
  if (/\bvest\b/.test(hay) && !/\bjacket\b/.test(hay)) return false;
  if (!isMensSignal(hay, path)) return false;
  if (isShowCompetition(hay, path)) return false;

  // Exclude ladies unless also mens-marked in title/handle
  if ((/\bladies\b/.test(hay) || /\bwomens?\b/.test(hay) || /\bgirls?\b/.test(hay)) && !/\bmens?\b/.test(hay) && !/\bmen's\b/.test(hay)) {
    return false;
  }

  return true;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate mens casual jackets → /clothing/mens/jackets');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title
    FROM collection_content WHERE url_path = ${PATH}
  `) as Array<Record<string, string>>;
  console.log('Content:', content[0] || '(missing — will create)');

  const reviewHandles = [
    'cavalleria-toscana-mens-ct-team-read-stripe-quilted-jacket',
    'cavalleria-toscana-striped-lightweight-jacket-mens',
    'cavalleria-toscana-mens-korean-jacket',
    'cavalleria-toscana-mens-padded-jacket-with-hood',
    'cavalleria-toscana-mens-pocket-jacket',
    'cavalleria-toscana-mens-tech-knit-bomber',
    'samshield-mens-st-moritz-jacket',
  ];

  const candidates = (await sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.product_type,
      pca.category_path,
      pca.canonical_path
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE
      p.handle = ANY(${reviewHandles})
      OR LOWER(COALESCE(p.title, '')) LIKE '%jacket%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%bomber%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%puffer%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%jacket%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%bomber%'
      OR pca.category_path IN (
        '/clothing/mens',
        '/clothing/outerwear/jackets',
        '/clothing/outerwear',
        ${PATH}
      )
    ORDER BY p.handle
  `) as unknown as Candidate[];

  const byHandle = new Map<string, Candidate>();
  for (const row of candidates) {
    if (reviewHandles.includes(row.handle) || looksLikeMensCasualJacket(row)) {
      // Never pull from show-jackets leaf unless review forced — review ones currently not there
      const path = normalizePath(row.category_path || '');
      if (path === SHOW_PATH && !reviewHandles.includes(row.handle)) continue;
      byHandle.set(row.handle, row);
    }
  }

  const all = [...byHandle.values()];
  const already = all.filter((m) => normalizePath(m.category_path || '') === PATH);
  const toMove = all.filter((m) => normalizePath(m.category_path || '') !== PATH);

  console.log(`Matched mens casual jackets: ${all.length}`);
  console.log(`Already on path: ${already.length}`);
  console.log(`To move: ${toMove.length}\n`);
  for (const row of all.sort((a, b) => a.handle.localeCompare(b.handle))) {
    const flag = normalizePath(row.category_path || '') === PATH ? 'KEEP' : 'MOVE';
    console.log(`[${flag}] ${row.handle} | ${row.category_path || '(none)'} | ${row.title}`);
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

  if (content.length) {
    await sql`
      UPDATE collection_content
      SET status = 'published',
          parent_url = '/clothing/mens',
          category_level = 3,
          h1_title = COALESCE(NULLIF(h1_title, ''), 'Men''s Jackets'),
          breadcrumb_label = COALESCE(NULLIF(breadcrumb_label, ''), 'Jackets'),
          updated_at = NOW()
      WHERE url_path = ${PATH}
    `;
    console.log(`\nPublished existing ${PATH}`);
  } else {
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
      ) VALUES (
        ${PATH}, 'Men''s Jackets', 'Jackets', '/clothing/mens', 3, 'published', NOW()
      )
    `;
    console.log(`\nCreated + published ${PATH}`);
  }

  // Mapping row for future classify
  await sql`
    INSERT INTO collection_mapping (
      top_level, parent_category, subcategory_handle, product_type, action, notes, updated_at
    ) VALUES (
      'clothing', 'mens', 'jackets', 'Mens Casual Jackets', 'include',
      'Created by consolidate-mens-jackets', NOW()
    )
    ON CONFLICT DO NOTHING
  `;

  let moved = 0;
  for (const row of toMove) {
    const newCanonical = normalizePath(`${PATH}/${row.handle}`);
    if (!row.category_path) {
      await sql`
        INSERT INTO product_category_assignments (
          product_id, product_handle, canonical_path, category_path,
          top_level, parent_category, subcategory_handle, updated_at
        ) VALUES (
          ${row.product_id}, ${row.handle}, ${newCanonical}, ${PATH},
          'clothing', 'mens', 'jackets', NOW()
        )
        ON CONFLICT (product_id) DO UPDATE
        SET product_handle = EXCLUDED.product_handle,
            canonical_path = EXCLUDED.canonical_path,
            category_path = EXCLUDED.category_path,
            top_level = 'clothing',
            parent_category = 'mens',
            subcategory_handle = 'jackets',
            updated_at = NOW()
      `;
    } else {
      await sql`
        UPDATE product_category_assignments
        SET canonical_path = ${newCanonical},
            category_path = ${PATH},
            top_level = 'clothing',
            parent_category = 'mens',
            subcategory_handle = 'jackets',
            updated_at = NOW()
        WHERE product_id = ${row.product_id}
      `;
      if (row.canonical_path && row.canonical_path !== newCanonical) {
        await sql`
          INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
          VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-mens-jackets', 'active', NOW())
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = '301',
              source = 'consolidate-mens-jackets',
              status = 'active',
              updated_at = NOW()
        `;
      }
    }
    moved += 1;
    console.log(`Moved ${row.handle} ← ${row.category_path || '(none)'}`);
  }

  const final = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${PATH}
  `) as Array<{ c: number }>;
  const showCount = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${SHOW_PATH}
  `) as Array<{ c: number }>;
  console.log(`\nDone. moved=${moved}; ${PATH}=${final[0]?.c || 0}; show-jackets still=${showCount[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
