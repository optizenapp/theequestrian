#!/usr/bin/env tsx
/**
 * Republish /horse/rugs/canvas and move all canvas rugs storewide into it.
 *
 * Usage:
 *   npx tsx scripts/consolidate-canvas-rugs.ts --floral-prod
 *   npx tsx scripts/consolidate-canvas-rugs.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/horse/rugs/canvas';

type Candidate = {
  product_id: string;
  handle: string;
  title: string;
  product_type: string | null;
  category_path: string | null;
  canonical_path: string | null;
  available_for_sale: boolean | null;
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

function looksLikeCanvasRug(row: Candidate): boolean {
  const title = (row.title || '').toLowerCase();
  const handle = (row.handle || '').toLowerCase();
  const type = (row.product_type || '').toLowerCase();
  const hay = `${title} ${handle} ${type}`;

  // Must look like a rug/cover, not random "canvas" (bags, prints, art)
  const isRug =
    /\brug\b/.test(hay) ||
    /\bhorse rug\b/.test(hay) ||
    /\bwaler\b/.test(hay) ||
    /\bcombo\b/.test(hay) ||
    /\bcover\b/.test(hay) ||
    type.includes('horse rugs') ||
    type.includes('rug');

  const isCanvas = /\bcanvas\b/.test(hay) || handle.includes('canvas');

  // Exclude obvious non-rugs
  const exclude =
    /\bbag\b/.test(hay) ||
    /\bprint\b/.test(hay) ||
    /\bartwork\b/.test(hay) ||
    /\bpainting\b/.test(hay) ||
    /\bcushion\b/.test(hay) ||
    /\btote\b/.test(hay) ||
    /\bpad\b/.test(hay) ||
    /\bsaddle\b/.test(hay);

  return isCanvas && isRug && !exclude;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate canvas rugs');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title, parent_url, category_level
    FROM collection_content WHERE url_path = ${PATH}
  `) as Array<Record<string, string | number | null>>;
  console.log('Content:', content[0] || '(missing)');

  // Broad candidate pull — filter in JS for precision
  const candidates = (await sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.product_type,
      p.available_for_sale,
      pca.category_path,
      pca.canonical_path
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE
      LOWER(COALESCE(p.title, '')) LIKE '%canvas%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%canvas%'
      OR LOWER(COALESCE(p.product_type, '')) LIKE '%canvas%'
    ORDER BY p.handle
  `) as unknown as Candidate[];

  const matches = candidates.filter(looksLikeCanvasRug);
  const already = matches.filter((m) => normalizePath(m.category_path || '') === PATH);
  const toMove = matches.filter((m) => normalizePath(m.category_path || '') !== PATH);

  console.log(`Canvas-ish product hits: ${candidates.length}`);
  console.log(`Matched as canvas rugs:  ${matches.length}`);
  console.log(`Already on ${PATH}:      ${already.length}`);
  console.log(`To move:                 ${toMove.length}\n`);

  for (const row of matches) {
    const flag = normalizePath(row.category_path || '') === PATH ? 'KEEP' : 'MOVE';
    console.log(
      `[${flag}] ${row.handle} | ${row.category_path || '(none)'} | ${row.title}`
    );
  }

  // Show rejected canvas hits for transparency
  const rejected = candidates.filter((c) => !looksLikeCanvasRug(c));
  if (rejected.length) {
    console.log(`\nSkipped non-rug canvas hits (${rejected.length}):`);
    for (const row of rejected.slice(0, 30)) {
      console.log(`  skip ${row.handle} | ${row.category_path || '(none)'} | ${row.title}`);
    }
    if (rejected.length > 30) console.log(`  ... +${rejected.length - 30} more`);
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
          parent_url = '/horse/rugs',
          category_level = 3,
          h1_title = COALESCE(NULLIF(h1_title, ''), 'Canvas Rugs'),
          breadcrumb_label = COALESCE(NULLIF(breadcrumb_label, ''), 'Canvas'),
          updated_at = NOW()
      WHERE url_path = ${PATH}
    `;
  } else {
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
      ) VALUES (
        ${PATH}, 'Canvas Rugs', 'Canvas', '/horse/rugs', 3, 'published', NOW()
      )
    `;
  }
  console.log(`\nPublished ${PATH}`);

  let moved = 0;
  for (const row of toMove) {
    const newCanonical = normalizePath(`${PATH}/${row.handle}`);
    if (!row.category_path) {
      // No allocation yet — insert
      await sql`
        INSERT INTO product_category_assignments (
          product_id, product_handle, canonical_path, category_path,
          top_level, parent_category, subcategory_handle, updated_at
        ) VALUES (
          ${row.product_id}, ${row.handle}, ${newCanonical}, ${PATH},
          'horse', 'rugs', 'canvas', NOW()
        )
        ON CONFLICT (product_id) DO UPDATE
        SET product_handle = EXCLUDED.product_handle,
            canonical_path = EXCLUDED.canonical_path,
            category_path = EXCLUDED.category_path,
            top_level = 'horse',
            parent_category = 'rugs',
            subcategory_handle = 'canvas',
            updated_at = NOW()
      `;
    } else {
      await sql`
        UPDATE product_category_assignments
        SET canonical_path = ${newCanonical},
            category_path = ${PATH},
            top_level = 'horse',
            parent_category = 'rugs',
            subcategory_handle = 'canvas',
            updated_at = NOW()
        WHERE product_id = ${row.product_id}
      `;
      if (row.canonical_path && row.canonical_path !== newCanonical) {
        await sql`
          INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
          VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-canvas-rugs', 'active', NOW())
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = '301',
              source = 'consolidate-canvas-rugs',
              status = 'active',
              updated_at = NOW()
        `;
      }
    }
    moved += 1;
    console.log(`Moved ${row.handle} ← ${row.category_path || '(none)'}`);
  }

  // Ensure mapping row for canvas rugs product types if useful
  const mapRows = (await sql`
    SELECT id, product_type, action
    FROM collection_mapping
    WHERE top_level = 'horse'
      AND parent_category = 'rugs'
      AND subcategory_handle = 'canvas'
  `) as Array<{ id: number; product_type: string; action: string }>;
  console.log(`Mapping rows on canvas: ${mapRows.length}`);

  const final = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${PATH}
  `) as Array<{ c: number }>;
  console.log(`\nDone. moved=${moved}; ${PATH} count=${final[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
