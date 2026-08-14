#!/usr/bin/env tsx
/**
 * Apply duplicate-category decisions:
 * 1) /clothing/tops → /clothing/womens/tops (draft + 301)
 * 2) /clothing/outerwear/jackets → split by gender:
 *      ladies casual → /clothing/womens/jackets (republish)
 *      mens casual → /clothing/mens/jackets
 *      riding/show → /clothing/womens/riding-jackets
 *    then draft + 301 outerwear/jackets → /clothing/womens/jackets
 *
 * Footwear: no structural change (keep flat siblings — see notes in dry-run).
 *
 * Usage:
 *   npx tsx scripts/apply-duplicate-category-merges.ts --floral-prod
 *   npx tsx scripts/apply-duplicate-category-merges.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

type Row = {
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
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

function splitCategoryPath(categoryPath: string) {
  const normalized = normalizePath(categoryPath);
  const parts = normalized.replace(/^\//, '').split('/').filter(Boolean);
  return {
    normalized,
    topLevel: parts[0] || null,
    parentCategory: parts[1] || null,
    subcategoryHandle: parts[2] || null,
  };
}

function haystack(row: Row): string {
  return `${row.title || ''} ${row.handle || ''} ${row.product_type || ''}`.toLowerCase();
}

function isMens(hay: string): boolean {
  return (
    (/\bmens?\b/.test(hay) || /\bmen's\b/.test(hay) || /\bunisex\b/.test(hay)) &&
    !/\bladies\b/.test(hay) &&
    !/\bwomens?\b/.test(hay)
  );
}

function isRidingShow(hay: string): boolean {
  return (
    /\bshow jacket\b/.test(hay) ||
    /\bcompetition jacket\b/.test(hay) ||
    /\briding jacket\b/.test(hay) ||
    /\bcomp jacket\b/.test(hay) ||
    /\btails\b/.test(hay) ||
    /\bfrack\b/.test(hay)
  );
}

function isTopNotJacket(hay: string): boolean {
  if (/\bjacket\b/.test(hay) || /\bbomber\b/.test(hay) || /\bpuffer\b/.test(hay)) {
    return false;
  }
  return (
    /\bcrew neck\b/.test(hay) ||
    /\bpull over\b/.test(hay) ||
    /\bpullover\b/.test(hay) ||
    /\bhoodie\b/.test(hay) ||
    /\brain coat\b/.test(hay) === false && /\btop\b/.test(hay)
  );
}

function targetForOuterwearJacket(row: Row): string {
  const hay = haystack(row);
  if (isRidingShow(hay)) return '/clothing/womens/riding-jackets';
  if (
    hay.includes('orbit-crew-neck') ||
    hay.includes('lisa-pull-over') ||
    (/\bcrew neck\b/.test(hay) && !/\bjacket\b/.test(hay))
  ) {
    return '/clothing/womens/tops';
  }
  if (isMens(hay)) return '/clothing/mens/jackets';
  return '/clothing/womens/jackets';
}

async function ensureManualRedirects(
  sql: ReturnType<typeof createSql>
): Promise<void> {
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
}

async function moveProduct(
  sql: ReturnType<typeof createSql>,
  row: Row,
  toPath: string,
  source: string,
  dryRun: boolean
): Promise<void> {
  const { normalized, topLevel, parentCategory, subcategoryHandle } =
    splitCategoryPath(toPath);
  const newCanonical = normalizePath(`${normalized}/${row.handle}`);
  const from = normalizePath(row.category_path || '');
  console.log(`  MOVE ${row.handle}`);
  console.log(`       ${from || '(none)'} → ${normalized}`);
  console.log(`       ${row.title}`);

  if (dryRun) return;

  await sql`
    UPDATE product_category_assignments
    SET canonical_path = ${newCanonical},
        category_path = ${normalized},
        top_level = ${topLevel},
        parent_category = ${parentCategory},
        subcategory_handle = ${subcategoryHandle},
        updated_at = NOW()
    WHERE product_id = ${row.product_id}
  `;

  if (row.canonical_path && row.canonical_path !== newCanonical) {
    await sql`
      INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
      VALUES (${row.canonical_path}, ${newCanonical}, '301', ${source}, 'active', NOW())
      ON CONFLICT (from_path) DO UPDATE
      SET to_path = EXCLUDED.to_path,
          redirect_type = '301',
          source = ${source},
          status = 'active',
          updated_at = NOW()
    `;
  }
}

async function draftAndRedirect(
  sql: ReturnType<typeof createSql>,
  fromPath: string,
  toPath: string,
  source: string,
  dryRun: boolean
): Promise<void> {
  console.log(`  DRAFT+301 ${fromPath} → ${toPath}`);
  if (dryRun) return;
  await sql`
    UPDATE collection_content
    SET status = 'draft', updated_at = NOW()
    WHERE url_path = ${fromPath} AND status = 'published'
  `;
  await sql`
    INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
    VALUES (${fromPath}, ${toPath}, '301', ${source}, 'active', NOW())
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = '301',
        source = ${source},
        status = 'active',
        updated_at = NOW()
  `;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);
  const source = 'apply-duplicate-category-merges';

  console.log('Apply duplicate category merges');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  console.log('Footwear note (no write):');
  console.log(
    '  Keep flat siblings — do NOT nest /clothing/footwear/boots/riding.'
  );
  console.log(
    '  /clothing/footwear/boots = all boots; /riding-boots + /tall-boots stay siblings.'
  );
  console.log('  Four hops is too deep for PLP UX + breadcrumbs.\n');

  if (!dryRun) await ensureManualRedirects(sql);

  // --- Tops merge ---
  console.log('1) Merge /clothing/tops → /clothing/womens/tops');
  const tops = (await sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.product_type,
      pca.category_path,
      pca.canonical_path
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE pca.category_path = '/clothing/tops'
    ORDER BY p.handle
  `) as unknown as Row[];
  console.log(`  Products to move: ${tops.length}`);
  for (const row of tops) {
    await moveProduct(sql, row, '/clothing/womens/tops', source, dryRun);
  }
  await draftAndRedirect(
    sql,
    '/clothing/tops',
    '/clothing/womens/tops',
    source,
    dryRun
  );

  // --- Outerwear jackets split ---
  console.log('\n2) Split /clothing/outerwear/jackets by gender/type');
  const outer = (await sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.product_type,
      pca.category_path,
      pca.canonical_path
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE pca.category_path = '/clothing/outerwear/jackets'
    ORDER BY p.handle
  `) as unknown as Row[];

  const buckets: Record<string, Row[]> = {};
  for (const row of outer) {
    const to = targetForOuterwearJacket(row);
    if (!buckets[to]) buckets[to] = [];
    buckets[to].push(row);
  }
  for (const [to, rows] of Object.entries(buckets)) {
    console.log(`  → ${to}: ${rows.length}`);
  }

  if (!dryRun) {
    await ensureManualRedirects(sql);

    // Republish /clothing/womens/jackets as casual (not riding)
    await sql`
      UPDATE collection_content
      SET status = 'published',
          parent_url = '/clothing/womens',
          category_level = 3,
          h1_title = 'Women''s Casual Jackets',
          breadcrumb_label = 'Jackets',
          updated_at = NOW()
      WHERE url_path = '/clothing/womens/jackets'
    `;
    const wj = (await sql`
      SELECT url_path FROM collection_content WHERE url_path = '/clothing/womens/jackets'
    `) as Array<{ url_path: string }>;
    if (!wj.length) {
      await sql`
        INSERT INTO collection_content (
          url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
        ) VALUES (
          '/clothing/womens/jackets',
          'Women''s Casual Jackets',
          'Jackets',
          '/clothing/womens',
          3,
          'published',
          NOW()
        )
      `;
    }
    console.log('  Published /clothing/womens/jackets');

    await sql`
      INSERT INTO collection_mapping (
        top_level, parent_category, subcategory_handle, product_type, action, notes, updated_at
      ) VALUES (
        'clothing', 'womens', 'jackets', 'Ladies Casual Jackets', 'include',
        ${source}, NOW()
      )
      ON CONFLICT DO NOTHING
    `;
  } else {
    console.log('  Would publish /clothing/womens/jackets (Women\'s Casual Jackets)');
  }

  for (const [to, rows] of Object.entries(buckets)) {
    for (const row of rows) {
      await moveProduct(sql, row, to, source, dryRun);
    }
  }

  await draftAndRedirect(
    sql,
    '/clothing/outerwear/jackets',
    '/clothing/womens/jackets',
    source,
    dryRun
  );

  if (!dryRun) {
    const counts = (await sql`
      SELECT category_path, COUNT(*)::int AS c
      FROM product_category_assignments
      WHERE category_path IN (
        '/clothing/tops',
        '/clothing/womens/tops',
        '/clothing/outerwear/jackets',
        '/clothing/womens/jackets',
        '/clothing/mens/jackets',
        '/clothing/womens/riding-jackets'
      )
      GROUP BY category_path
      ORDER BY category_path
    `) as Array<{ category_path: string; c: number }>;
    console.log('\nFinal counts:');
    for (const r of counts) console.log(`  ${r.category_path}: ${r.c}`);
  } else {
    console.log('\nDry run — pass --apply to write.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
