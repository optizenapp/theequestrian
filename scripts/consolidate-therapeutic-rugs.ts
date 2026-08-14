#!/usr/bin/env tsx
/**
 * Create/publish /horse/rugs/therapeutic and move magnetic/therapeutic rugs storewide.
 *
 * Usage:
 *   npx tsx scripts/consolidate-therapeutic-rugs.ts --floral-prod
 *   npx tsx scripts/consolidate-therapeutic-rugs.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/horse/rugs/therapeutic';

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

function looksLikeTherapeuticRug(row: Candidate): boolean {
  const title = (row.title || '').toLowerCase();
  const handle = (row.handle || '').toLowerCase();
  const type = (row.product_type || '').toLowerCase();
  const path = (row.category_path || '').toLowerCase();
  const hay = `${title} ${handle} ${type} ${path}`;

  const therapeuticSignal =
    /\bmagnetic\b/.test(hay) ||
    /\btherapeutic\b/.test(hay) ||
    /\btherapy\b/.test(hay) ||
    /\brecuptex\b/.test(hay) ||
    /\brecovery\b/.test(hay) ||
    /\bemf\b/.test(hay) ||
    handle.includes('magnetic') ||
    handle.includes('therapeutic') ||
    handle.includes('recuptex');

  // Prefer rug/cover/combo/hood/sheet context; allow magnetic rug products
  // even if currently misfiled under boots.
  const rugContext =
    /\brug\b/.test(hay) ||
    /\bsheet\b/.test(hay) ||
    /\bcombo\b/.test(hay) ||
    /\bcover\b/.test(hay) ||
    /\bhood\b/.test(hay) ||
    type.includes('horse rugs') ||
    type.includes('rug') ||
    path.includes('/horse/rugs') ||
    path.includes('/horse/boots'); // known misfile for magnetic rug

  const exclude =
    /\bboot\b/.test(title) && !/\brug\b/.test(title) ||
    /\bboots\b/.test(title) && !/\brug\b/.test(title) ||
    /\bpad\b/.test(hay) ||
    /\bbell\b/.test(hay) ||
    /\bfetlock\b/.test(hay) ||
    /\btendon\b/.test(hay) ||
    /\bhock\b/.test(hay) ||
    /\bwraps?\b/.test(hay) ||
    /\bbandage\b/.test(hay) ||
    /\bmask\b/.test(hay) ||
    /\bbonnet\b/.test(hay);

  // Magnetic therapy boots should stay in boots — exclude unless title says rug
  if (/\bboot/.test(title) && !/\brug\b/.test(title) && !/\bsheet\b/.test(title)) {
    return false;
  }

  return therapeuticSignal && rugContext && !exclude;
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Consolidate therapeutic rugs');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title, parent_url, category_level
    FROM collection_content WHERE url_path = ${PATH}
  `) as Array<Record<string, string | number | null>>;
  console.log('Content:', content[0] || '(missing — will create)');

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
      LOWER(COALESCE(p.title, '')) LIKE '%magnetic%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%therapeutic%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%therapy%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%recuptex%'
      OR LOWER(COALESCE(p.title, '')) LIKE '%recovery%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%magnetic%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%therapeutic%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%therapy%'
      OR LOWER(COALESCE(p.handle, '')) LIKE '%recuptex%'
      OR LOWER(COALESCE(p.product_type, '')) LIKE '%magnetic%'
      OR LOWER(COALESCE(p.product_type, '')) LIKE '%therapeutic%'
    ORDER BY p.handle
  `) as unknown as Candidate[];

  const matches = candidates.filter(looksLikeTherapeuticRug);
  const already = matches.filter((m) => normalizePath(m.category_path || '') === PATH);
  const toMove = matches.filter((m) => normalizePath(m.category_path || '') !== PATH);
  const rejected = candidates.filter((c) => !looksLikeTherapeuticRug(c));

  console.log(`Therapeutic/magnetic hits: ${candidates.length}`);
  console.log(`Matched as therapeutic rugs: ${matches.length}`);
  console.log(`Already on ${PATH}: ${already.length}`);
  console.log(`To move: ${toMove.length}\n`);

  for (const row of matches) {
    const flag = normalizePath(row.category_path || '') === PATH ? 'KEEP' : 'MOVE';
    console.log(
      `[${flag}] ${row.handle} | ${row.category_path || '(none)'} | ${row.title}`
    );
  }

  if (rejected.length) {
    console.log(`\nSkipped non-rug therapeutic hits (${rejected.length}):`);
    for (const row of rejected.slice(0, 40)) {
      console.log(`  skip ${row.handle} | ${row.category_path || '(none)'} | ${row.title}`);
    }
    if (rejected.length > 40) console.log(`  ... +${rejected.length - 40} more`);
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
          h1_title = COALESCE(NULLIF(h1_title, ''), 'Therapeutic & Magnetic Rugs'),
          breadcrumb_label = COALESCE(NULLIF(breadcrumb_label, ''), 'Therapeutic'),
          updated_at = NOW()
      WHERE url_path = ${PATH}
    `;
    console.log(`\nPublished existing ${PATH}`);
  } else {
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
      ) VALUES (
        ${PATH},
        'Therapeutic & Magnetic Rugs',
        'Therapeutic',
        '/horse/rugs',
        3,
        'published',
        NOW()
      )
    `;
    console.log(`\nCreated + published ${PATH}`);
  }

  // Ensure mapping include row so future classify can land here
  const existingMap = (await sql`
    SELECT id FROM collection_mapping
    WHERE top_level = 'horse'
      AND parent_category = 'rugs'
      AND subcategory_handle = 'therapeutic'
      AND product_type = 'Therapeutic Rugs'
    LIMIT 1
  `) as Array<{ id: number }>;
  if (!existingMap.length) {
    await sql`
      INSERT INTO collection_mapping (
        top_level, parent_category, subcategory_handle, product_type, action, notes, updated_at
      ) VALUES (
        'horse', 'rugs', 'therapeutic', 'Therapeutic Rugs', 'include',
        'Created by consolidate-therapeutic-rugs', NOW()
      )
      ON CONFLICT DO NOTHING
    `;
    // Also magnetic rugs type alias via merge if useful
    await sql`
      INSERT INTO collection_mapping (
        top_level, parent_category, subcategory_handle, product_type, action, merge_to, notes, updated_at
      ) VALUES (
        'horse', 'rugs', 'therapeutic', 'Magnetic Rugs', 'include',
        NULL, 'Created by consolidate-therapeutic-rugs', NOW()
      )
      ON CONFLICT DO NOTHING
    `;
  }

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
          'horse', 'rugs', 'therapeutic', NOW()
        )
        ON CONFLICT (product_id) DO UPDATE
        SET product_handle = EXCLUDED.product_handle,
            canonical_path = EXCLUDED.canonical_path,
            category_path = EXCLUDED.category_path,
            top_level = 'horse',
            parent_category = 'rugs',
            subcategory_handle = 'therapeutic',
            updated_at = NOW()
      `;
    } else {
      await sql`
        UPDATE product_category_assignments
        SET canonical_path = ${newCanonical},
            category_path = ${PATH},
            top_level = 'horse',
            parent_category = 'rugs',
            subcategory_handle = 'therapeutic',
            updated_at = NOW()
        WHERE product_id = ${row.product_id}
      `;
      if (row.canonical_path && row.canonical_path !== newCanonical) {
        await sql`
          INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
          VALUES (${row.canonical_path}, ${newCanonical}, '301', 'consolidate-therapeutic-rugs', 'active', NOW())
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = '301',
              source = 'consolidate-therapeutic-rugs',
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
