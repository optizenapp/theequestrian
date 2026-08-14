#!/usr/bin/env tsx
/**
 * Finish thin-leaf cleanup:
 * 1. Misallocated saddle pads under /accessories/brands → pad leaves
 * 2. /clothing/bottoms → /clothing
 * 3. Keep /clothing/mens/show-jackets and backfill men's show/competition/riding jackets
 *
 * Usage:
 *   npx tsx scripts/apply-thin-leaf-followups.ts --floral-prod
 *   npx tsx scripts/apply-thin-leaf-followups.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

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
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
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

async function ensureRedirects(sql: ReturnType<typeof createSql>) {
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

async function upsertRedirect(
  sql: ReturnType<typeof createSql>,
  fromPath: string,
  toPath: string
) {
  await sql`
    INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
    VALUES (${fromPath}, ${toPath}, '301', 'thin-leaf-followup', 'active', NOW())
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = '301',
        source = 'thin-leaf-followup',
        status = 'active',
        updated_at = NOW()
  `;
}

async function moveAllocation(
  sql: ReturnType<typeof createSql>,
  row: AllocRow,
  newCategoryPath: string,
  dryRun: boolean
) {
  const parts = splitCategoryPath(newCategoryPath);
  if (!parts.topLevel) throw new Error(`Bad category path: ${newCategoryPath}`);
  const newCanonical = normalizePath(`${parts.normalized}/${row.product_handle}`);
  console.log(
    `  ${row.product_handle}: ${row.category_path} → ${parts.normalized}`
  );
  if (dryRun) return;

  await sql`
    UPDATE product_category_assignments
    SET canonical_path = ${newCanonical},
        category_path = ${parts.normalized},
        top_level = ${parts.topLevel},
        parent_category = ${parts.parentCategory},
        subcategory_handle = ${parts.subcategoryHandle},
        updated_at = NOW()
    WHERE product_id = ${row.product_id}
  `;
  if (row.canonical_path !== newCanonical) {
    await upsertRedirect(sql, row.canonical_path, newCanonical);
  }
}

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Thin-leaf followups');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  if (!dryRun) await ensureRedirects(sql);

  // 1. Saddle pads wrongly under /accessories/brands
  console.log('1) /accessories/brands saddle pads → pad leaves');
  const brandPads = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE category_path = '/accessories/brands'
    ORDER BY product_handle
  `) as unknown as AllocRow[];

  for (const row of brandPads) {
    const handle = row.product_handle.toLowerCase();
    const padPath = handle.includes('jump')
      ? '/horse/pads/jumping'
      : handle.includes('dressage')
        ? '/horse/pads/dressage'
        : '/horse/pads';
    await moveAllocation(sql, row, padPath, dryRun);
  }
  if (!dryRun && brandPads.length) {
    await upsertRedirect(sql, '/accessories/brands', '/accessories');
  }

  // 2. /clothing/bottoms → /clothing
  console.log('\n2) /clothing/bottoms → /clothing');
  const bottoms = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE category_path = '/clothing/bottoms'
    ORDER BY product_handle
  `) as unknown as AllocRow[];
  for (const row of bottoms) {
    await moveAllocation(sql, row, '/clothing', dryRun);
  }
  if (!dryRun && bottoms.length) {
    await upsertRedirect(sql, '/clothing/bottoms', '/clothing');
  }

  // 3. Backfill men's show jackets
  console.log('\n3) Backfill /clothing/mens/show-jackets');
  const showJacketHandles = [
    // already there: samshield-miami-matt-mens-riding-jacket
    'rg-italia-mesh-riding-jacket-mens',
    'samshield-louis-matt-competition-jacket',
    'samshield-louis-matt-competition-jacket-1',
    'samshield-mathisse-mens-riding-jacket-fw25',
    'samshield-miami-matt-mens-competition-jacket',
    'samshield-louis-air-comp-jacket-ss24',
    'trolle-cool-dots-ultra-riding-jacket-mens',
    'cavalleria-toscana-mens-gp-riding-jacket',
    'cavalleria-toscana-mens-light-tech-knit-zip-riding-jacket',
    'cavalleria-toscana-mens-tech-knit-zip-riding-jacket',
    'cavalleria-toscana-tech-knit-riding-jacket-mens',
    'samshield-miami-mens-riding-jacket',
    'ego7-mens-air-competition-jacket',
    'trolle-light-tech-class-riding-jacket-mens',
  ];

  const toMove = (await sql`
    SELECT product_id, product_handle, canonical_path, category_path
    FROM product_category_assignments
    WHERE product_handle = ANY(${showJacketHandles})
      AND category_path IS DISTINCT FROM '/clothing/mens/show-jackets'
    ORDER BY product_handle
  `) as unknown as AllocRow[];

  for (const row of toMove) {
    await moveAllocation(sql, row, '/clothing/mens/show-jackets', dryRun);
  }

  // Ensure leaf content exists + published
  const content = (await sql`
    SELECT url_path, status FROM collection_content
    WHERE url_path = '/clothing/mens/show-jackets'
  `) as Array<{ url_path: string; status: string }>;

  if (!content.length) {
    console.log('  creating collection_content for /clothing/mens/show-jackets');
    if (!dryRun) {
      await sql`
        INSERT INTO collection_content (
          url_path, h1_title, breadcrumb_label, parent_url, category_level, status, updated_at
        )
        VALUES (
          '/clothing/mens/show-jackets',
          'Men''s Show Jackets',
          'Show Jackets',
          '/clothing/mens',
          3,
          'published',
          NOW()
        )
        ON CONFLICT (url_path) DO UPDATE
        SET status = 'published',
            parent_url = '/clothing/mens',
            category_level = 3,
            updated_at = NOW()
      `;
    }
  } else if (content[0].status !== 'published') {
    console.log(`  publishing collection_content (was ${content[0].status})`);
    if (!dryRun) {
      await sql`
        UPDATE collection_content
        SET status = 'published',
            parent_url = COALESCE(parent_url, '/clothing/mens'),
            updated_at = NOW()
        WHERE url_path = '/clothing/mens/show-jackets'
      `;
    }
  } else {
    console.log('  collection_content already published');
  }

  const finalCount = (await sql`
    SELECT COUNT(*)::int AS c
    FROM product_category_assignments
    WHERE category_path = '/clothing/mens/show-jackets'
  `) as Array<{ c: number }>;
  console.log(`\n  /clothing/mens/show-jackets leaf count: ${finalCount[0]?.c || 0}`);

  if (dryRun) console.log('\nDry run — pass --apply to write.');
  else console.log('\nApplied.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
