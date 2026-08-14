#!/usr/bin/env tsx
/**
 * Move all kids/youth breeches + riding tights into /clothing/kids/breeches.
 *
 * Usage:
 *   npx tsx scripts/consolidate-kids-breeches.ts --floral-prod
 *   npx tsx scripts/consolidate-kids-breeches.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/clothing/kids/breeches';

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

function isKidsSignal(hay: string, path: string): boolean {
  return (
    /\bkids?\b/.test(hay) ||
    /\bchild/.test(hay) ||
    /\byouth\b/.test(hay) ||
    /\bjunior\b/.test(hay) ||
    /\byoung rider/.test(hay) ||
    /\bboys?\b/.test(hay) ||
    /\bgirls?\b/.test(hay) ||
    path.startsWith('/clothing/kids') ||
    hay.includes("kid's") ||
    hay.includes('kids clothing')
  );
}

function isBreechOrTight(hay: string): boolean {
  return (
    /\bbreech/.test(hay) ||
    /\bjodhpur/.test(hay) ||
    /\bjodphur/.test(hay) || // common misspelling in catalog
    /\btight/.test(hay) ||
    /\briding tight/.test(hay)
  );
}

function looksLikeKidsBreechOrTight(row: Candidate): boolean {
  const title = (row.title || '').toLowerCase();
  const handle = (row.handle || '').toLowerCase();
  const type = (row.product_type || '').toLowerCase();
  const path = normalizePath(row.category_path || '').toLowerCase();
  const hay = `${title} ${handle} ${type}`;

  if (!isBreechOrTight(hay)) return false;
  if (!isKidsSignal(hay, path)) return false;

  // Exclude adult unless explicitly kids/youth
  const adultOnly =
    (/\bladies\b/.test(hay) || /\bwomens?\b/.test(hay) || /\bmens?\b/.test(hay)) &&
    !isKidsSignal(hay, path);
  if (adultOnly) return false;

  return true;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate kids breeches/tights → /clothing/kids/breeches');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title
    FROM collection_content WHERE url_path = ${PATH}
  `) as Array<Record<string, string>>;
  console.log('Content:', content[0] || '(missing)');

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
      LOWER(COALESCE(p.title, '')) LIKE '%breech%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%jodhpur%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%jodphur%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%tight%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%breech%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%jodhpur%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%tight%'
      OR LOWER(COALESCE(p.product_type, '')) LIKE '%breech%'
      OR LOWER(COALESCE(p.product_type, '')) LIKE '%tight%'
      OR pca.category_path = ${PATH}
      OR pca.category_path = '/clothing/womens/tights'
      OR pca.category_path = '/clothing/kids'
    ORDER BY p.handle
  `) as unknown as Candidate[];

  // Also include known youth tights already under womens from prior scan
  const matches = candidates.filter(looksLikeKidsBreechOrTight);
  // Extra: bare-youth tights if present
  const extraHandles = [
    'bare-youth-competition-tights',
    'bare-youth-thermofit-winter-performance-riding-tights',
    'cavalleria-toscana-ct-dash-breeches-boys',
    'cavallo-calima-grip-youth-breeches',
    'elt-kids-denali-riding-tights',
    'kids-riding-tights',
  ];
  const byHandle = new Map(matches.map((m) => [m.handle, m]));
  for (const c of candidates) {
    if (extraHandles.includes(c.handle)) byHandle.set(c.handle, c);
  }
  const all = [...byHandle.values()];
  const already = all.filter((m) => normalizePath(m.category_path || '') === PATH);
  const toMove = all.filter((m) => normalizePath(m.category_path || '') !== PATH);

  console.log(`Matched kids breeches/tights: ${all.length}`);
  console.log(`Already on path: ${already.length}`);
  console.log(`To move: ${toMove.length}\n`);

  for (const row of all.sort((a, b) => a.handle.localeCompare(b.handle))) {
    const flag = normalizePath(row.category_path || '') === PATH ? 'KEEP' : 'MOVE';
    console.log(
      `[${flag}] ${row.handle} | ${row.category_path || '(none)'} | ${row.title}`
    );
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

  await sql`
    UPDATE collection_content
    SET status = 'published',
        parent_url = '/clothing/kids',
        category_level = 3,
        updated_at = NOW()
    WHERE url_path = ${PATH}
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
          'clothing', 'kids', 'breeches', NOW()
        )
        ON CONFLICT (product_id) DO UPDATE
        SET product_handle = EXCLUDED.product_handle,
            canonical_path = EXCLUDED.canonical_path,
            category_path = EXCLUDED.category_path,
            top_level = 'clothing',
            parent_category = 'kids',
            subcategory_handle = 'breeches',
            updated_at = NOW()
      `;
    } else {
      await sql`
        UPDATE product_category_assignments
        SET canonical_path = ${newCanonical},
            category_path = ${PATH},
            top_level = 'clothing',
            parent_category = 'kids',
            subcategory_handle = 'breeches',
            updated_at = NOW()
        WHERE product_id = ${row.product_id}
      `;
      if (row.canonical_path && row.canonical_path !== newCanonical) {
        await sql`
          INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
          VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-kids-breeches', 'active', NOW())
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = '301',
              source = 'consolidate-kids-breeches',
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
  console.log(`\nDone. moved=${moved}; ${PATH} count=${final[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
