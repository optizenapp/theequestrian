#!/usr/bin/env tsx
/**
 * Create /clothing/womens/riding-jackets and consolidate ladies riding/show jackets.
 *
 * Usage:
 *   npx tsx scripts/consolidate-womens-riding-jackets.ts --floral-prod
 *   npx tsx scripts/consolidate-womens-riding-jackets.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/clothing/womens/riding-jackets';

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

function isLadiesSignal(hay: string, path: string): boolean {
  const mensExplicit =
    (/\bmens?\b/.test(hay) || /\bmen's\b/.test(hay)) &&
    !/\bladies\b/.test(hay) &&
    !/\bwomens?\b/.test(hay);
  if (mensExplicit) return false;
  if (path.startsWith('/clothing/mens')) return false;

  return (
    /\bladies\b/.test(hay) ||
    /\bwomens?\b/.test(hay) ||
    /\bwomen's\b/.test(hay) ||
    path.startsWith('/clothing/womens') ||
    path === '/clothing/outerwear/show-jackets' ||
    path === '/clothing/outerwear/riding-jackets' ||
    // default: if on show/riding outerwear and not mens-marked, treat as ladies
    ((path === '/clothing/outerwear/show-jackets' ||
      path === '/clothing/outerwear/riding-jackets') &&
      !mensExplicit)
  );
}

function isRidingOrShowJacket(hay: string, path: string): boolean {
  const onSourcePath =
    path === '/clothing/outerwear/show-jackets' ||
    path === '/clothing/outerwear/riding-jackets' ||
    path === PATH;

  const signal =
    /\bshow jacket\b/.test(hay) ||
    /\bcompetition jacket\b/.test(hay) ||
    /\briding jacket\b/.test(hay) ||
    /\bcomp jacket\b/.test(hay) ||
    /\btails\b/.test(hay) ||
    /\bfrack\b/.test(hay) ||
    /\bgp jacket\b/.test(hay) ||
    /\bgp tails\b/.test(hay) ||
    onSourcePath;

  // Must be jacket-like (or tails)
  const jacketLike =
    /\bjacket\b/.test(hay) ||
    /\btails\b/.test(hay) ||
    /\bfrack\b/.test(hay) ||
    onSourcePath;

  return signal && jacketLike;
}

function looksLikeWomensRidingJacket(row: Candidate): boolean {
  const title = (row.title || '').toLowerCase();
  const handle = (row.handle || '').toLowerCase();
  const type = (row.product_type || '').toLowerCase();
  const path = normalizePath(row.category_path || '').toLowerCase();
  const hay = `${title} ${handle} ${type}`;

  if (!isLadiesSignal(hay, path)) return false;
  if (!isRidingOrShowJacket(hay, path)) return false;

  // Exclude kids
  if (/\bkids?\b/.test(hay) || /\bgirls?\b/.test(hay) || /\byouth\b/.test(hay) || /\bchild/.test(hay)) {
    return false;
  }

  // Exclude casual lifestyle jackets unless clearly riding/show
  if (
    path === '/clothing/outerwear/jackets' &&
    !/\bshow|competition|riding|comp jacket|tails|frack|gp jacket/.test(hay)
  ) {
    return false;
  }

  return true;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate womens riding/show jackets → /clothing/womens/riding-jackets');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title
    FROM collection_content WHERE url_path = ${PATH}
  `) as Array<Record<string, string>>;
  console.log('Content:', content[0] || '(missing — will create)');

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
      pca.category_path IN (
        '/clothing/outerwear/show-jackets',
        '/clothing/outerwear/riding-jackets',
        '/clothing/womens',
        '/clothing/womens/jackets',
        ${PATH}
      )
      OR LOWER(COALESCE(p.title, '')) LIKE '%riding jacket%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%show jacket%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%competition jacket%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%comp jacket%'
      OR LOWER(COALESCE(p.title, '')) LIKE '% tails%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%riding-jacket%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%show-jacket%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%competition-jacket%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%-tails%'
    ORDER BY p.handle
  `) as unknown as Candidate[];

  const all = candidates.filter(looksLikeWomensRidingJacket);
  const already = all.filter((m) => normalizePath(m.category_path || '') === PATH);
  const toMove = all.filter((m) => normalizePath(m.category_path || '') !== PATH);

  console.log(`Matched: ${all.length}`);
  console.log(`Already: ${already.length}`);
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
          parent_url = '/clothing/womens',
          category_level = 3,
          h1_title = COALESCE(NULLIF(h1_title, ''), 'Women''s Riding & Show Jackets'),
          breadcrumb_label = COALESCE(NULLIF(breadcrumb_label, ''), 'Riding Jackets'),
          updated_at = NOW()
      WHERE url_path = ${PATH}
    `;
  } else {
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
      ) VALUES (
        ${PATH},
        'Women''s Riding & Show Jackets',
        'Riding Jackets',
        '/clothing/womens',
        3,
        'published',
        NOW()
      )
    `;
  }
  console.log(`\nPublished ${PATH}`);

  await sql`
    INSERT INTO collection_mapping (
      top_level, parent_category, subcategory_handle, product_type, action, notes, updated_at
    ) VALUES (
      'clothing', 'womens', 'riding-jackets', 'Ladies Riding Jackets', 'include',
      'Created by consolidate-womens-riding-jackets', NOW()
    )
    ON CONFLICT DO NOTHING
  `;

  let moved = 0;
  for (const row of toMove) {
    const newCanonical = normalizePath(`${PATH}/${row.handle}`);
    await sql`
      UPDATE product_category_assignments
      SET canonical_path = ${newCanonical},
          category_path = ${PATH},
          top_level = 'clothing',
          parent_category = 'womens',
          subcategory_handle = 'riding-jackets',
          updated_at = NOW()
      WHERE product_id = ${row.product_id}
    `;
    if (row.canonical_path && row.canonical_path !== newCanonical) {
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-womens-riding-jackets', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'consolidate-womens-riding-jackets',
            status = 'active',
            updated_at = NOW()
      `;
    }
    moved += 1;
    console.log(`Moved ${row.handle} ← ${row.category_path || '(none)'}`);
  }

  // If outerwear show/riding leaves are now empty, draft + redirect to new path
  for (const oldPath of [
    '/clothing/outerwear/show-jackets',
    '/clothing/outerwear/riding-jackets',
  ]) {
    const left = (await sql`
      SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${oldPath}
    `) as Array<{ c: number }>;
    if ((left[0]?.c || 0) === 0) {
      await sql`
        UPDATE collection_content
        SET status = 'draft', updated_at = NOW()
        WHERE url_path = ${oldPath} AND status = 'published'
      `;
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${oldPath}, ${PATH}, '301', 'consolidate-womens-riding-jackets', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'consolidate-womens-riding-jackets',
            status = 'active',
            updated_at = NOW()
      `;
      console.log(`Drafted + redirected empty ${oldPath} → ${PATH}`);
    } else {
      console.log(`Left ${left[0]?.c} products on ${oldPath} (not emptied)`);
    }
  }

  const final = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${PATH}
  `) as Array<{ c: number }>;
  console.log(`\nDone. moved=${moved}; ${PATH}=${final[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
