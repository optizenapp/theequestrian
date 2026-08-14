#!/usr/bin/env tsx
/**
 * Republish /clothing/footwear/accessories and move review products into it.
 *
 * Usage:
 *   npx tsx scripts/republish-footwear-accessories.ts --floral-prod
 *   npx tsx scripts/republish-footwear-accessories.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const PATH = '/clothing/footwear/accessories';
const HANDLES = ['cavallo-boot-shapers'];

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

  console.log('Republish footwear accessories');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title, parent_url, category_level
    FROM collection_content WHERE url_path = ${PATH}
  `) as Array<Record<string, string | number | null>>;
  console.log('Content:', content[0] || '(missing)');

  const existing = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE category_path = ${PATH}
    ORDER BY product_handle
  `) as unknown as AllocRow[];
  console.log(`Already on path: ${existing.length}`);
  for (const row of existing) console.log(`  ${row.product_handle}`);

  const toMove = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE product_handle = ANY(${HANDLES})
      AND category_path IS DISTINCT FROM ${PATH}
    ORDER BY product_handle
  `) as unknown as AllocRow[];
  console.log(`\nTo move in: ${toMove.length}`);
  for (const row of toMove) {
    console.log(`  ${row.product_handle}  (${row.category_path})`);
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
          parent_url = '/clothing/footwear',
          category_level = 3,
          h1_title = COALESCE(NULLIF(h1_title, ''), 'Footwear Accessories'),
          breadcrumb_label = COALESCE(NULLIF(breadcrumb_label, ''), 'Accessories'),
          updated_at = NOW()
      WHERE url_path = ${PATH}
    `;
  } else {
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
      ) VALUES (
        ${PATH}, 'Footwear Accessories', 'Accessories', '/clothing/footwear', 3, 'published', NOW()
      )
    `;
  }
  console.log(`Published ${PATH}`);

  for (const row of toMove) {
    const newCanonical = normalizePath(`${PATH}/${row.product_handle}`);
    await sql`
      UPDATE product_category_assignments
      SET canonical_path = ${newCanonical},
          category_path = ${PATH},
          top_level = 'clothing',
          parent_category = 'footwear',
          subcategory_handle = 'accessories',
          updated_at = NOW()
      WHERE product_id = ${row.product_id}
    `;
    if (row.canonical_path !== newCanonical) {
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${row.canonical_path}, ${newCanonical}, '301', 'republish-footwear-accessories', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'republish-footwear-accessories',
            status = 'active',
            updated_at = NOW()
      `;
    }
    console.log(`Moved ${row.product_handle}`);
  }

  // Ensure mapping exists for footwear accessories if any product_type rows pointed here
  const mapCount = (await sql`
    SELECT COUNT(*)::int AS c FROM collection_mapping
    WHERE top_level = 'clothing'
      AND parent_category = 'footwear'
      AND subcategory_handle = 'accessories'
      AND action != 'exclude'
  `) as Array<{ c: number }>;
  console.log(`Mapping rows on path: ${mapCount[0]?.c || 0}`);

  const final = (await sql`
    SELECT COUNT(*)::int AS c FROM product_category_assignments WHERE category_path = ${PATH}
  `) as Array<{ c: number }>;
  console.log(`\nDone. ${PATH} count=${final[0]?.c || 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
