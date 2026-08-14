#!/usr/bin/env tsx
/**
 * Repair category PLP allocations after Collective drift.
 *
 * - Repoint stale product_id on allocations (catalog-wide)
 * - Allocate orphans with a unique collection_mapping product_type
 * - Recode unique type mismatches to the mapped category_path
 *
 * Usage:
 *   npx tsx scripts/apply-category-plp-repair.ts --floral-prod
 *   npx tsx scripts/apply-category-plp-repair.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

type MappingRow = {
  top_level: string;
  parent_category: string | null;
  subcategory_handle: string | null;
  product_type: string;
  action: string;
};

type StaleRow = {
  product_handle: string;
  old_product_id: string;
  new_product_id: string;
  canonical_path: string;
  category_path: string;
  title: string | null;
  vendor: string | null;
};

type OrphanRow = {
  product_id: string;
  handle: string;
  title: string | null;
  vendor: string | null;
  product_type: string | null;
};

type MismatchRow = {
  product_id: string;
  product_handle: string;
  category_path: string;
  canonical_path: string;
  product_type: string | null;
  title: string | null;
  vendor: string | null;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function mappingPath(row: MappingRow): string {
  const parts = [row.top_level, row.parent_category, row.subcategory_handle]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  return normalizePath(parts.join('/'));
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

function writeCsv(path: string, headers: string[], rows: string[][]): void {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map((cell) => csvEscape(cell)).join(','));
  }
  writeFileSync(path, `${lines.join('\n')}\n`);
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

async function upsertManualRedirect(
  sql: ReturnType<typeof createSql>,
  fromPath: string,
  toPath: string
): Promise<void> {
  await sql`
    INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
    VALUES (${fromPath}, ${toPath}, '301', 'category-plp-repair', 'active', NOW())
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = '301',
        source = 'category-plp-repair',
        status = 'active',
        updated_at = NOW()
  `;
}

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Category PLP repair');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const mappingRows = (await sql`
    SELECT top_level, parent_category, subcategory_handle, product_type, action
    FROM collection_mapping
    WHERE action != 'exclude'
  `) as unknown as MappingRow[];

  const typeToPaths = new Map<string, Set<string>>();
  for (const row of mappingRows) {
    const typeKey = row.product_type.trim().toLowerCase();
    if (!typeKey) continue;
    if (!typeToPaths.has(typeKey)) typeToPaths.set(typeKey, new Set());
    typeToPaths.get(typeKey)!.add(mappingPath(row));
  }

  const staleRows = (await sql`
    SELECT
      pca.product_handle,
      pca.product_id AS old_product_id,
      p.id AS new_product_id,
      pca.canonical_path,
      pca.category_path,
      p.title,
      p.vendor
    FROM product_category_assignments pca
    INNER JOIN products p ON p.handle = pca.product_handle
    WHERE pca.product_id IS DISTINCT FROM p.id
    ORDER BY pca.product_handle
  `) as unknown as StaleRow[];

  const orphanRows = (await sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.vendor,
      p.product_type
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE pca.product_id IS NULL
      AND COALESCE(p.available_for_sale, true) = true
    ORDER BY p.handle
  `) as unknown as OrphanRow[];

  const allocated = (await sql`
    SELECT
      pca.product_id,
      pca.product_handle,
      pca.category_path,
      pca.canonical_path,
      p.product_type,
      p.title,
      p.vendor
    FROM product_category_assignments pca
    INNER JOIN products p ON p.handle = pca.product_handle
    ORDER BY pca.product_handle
  `) as unknown as MismatchRow[];

  const allocatePreview: string[][] = [];
  const recodePreview: string[][] = [];

  for (const orphan of orphanRows) {
    const productType = (orphan.product_type || '').trim();
    if (!productType) continue;
    const paths = typeToPaths.get(productType.toLowerCase());
    if (!paths || paths.size !== 1) continue;
    const categoryPath = [...paths][0];
    const canonicalPath = normalizePath(`${categoryPath}/${orphan.handle}`);
    allocatePreview.push([
      orphan.handle,
      orphan.product_id,
      orphan.title || '',
      orphan.vendor || '',
      productType,
      categoryPath,
      canonicalPath,
      'allocate_orphan',
    ]);
  }

  for (const row of allocated) {
    const productType = (row.product_type || '').trim();
    if (!productType) continue;
    const paths = typeToPaths.get(productType.toLowerCase());
    if (!paths || paths.size !== 1) continue;
    const mappedPath = [...paths][0];
    const current = normalizePath(row.category_path);
    if (mappedPath === current) continue;
    // Only auto-recode when mapping points to a deeper leaf under the current
    // path (refine). Sibling / wrong-branch moves from coarse vendor types
    // (e.g. "Saddles" on a half-pad) stay in the CSV for human review.
    const mappedUnderCurrent = mappedPath.startsWith(current + '/');
    if (!mappedUnderCurrent) continue;
    const newCanonical = normalizePath(`${mappedPath}/${row.product_handle}`);
    recodePreview.push([
      row.product_handle,
      row.product_id,
      row.title || '',
      row.vendor || '',
      productType,
      current,
      mappedPath,
      row.canonical_path,
      newCanonical,
      'recode_deepen',
    ]);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = resolve(process.cwd(), 'exports');
  mkdirSync(outDir, { recursive: true });

  const stalePath = resolve(outDir, `category-repair-stale-${stamp}.csv`);
  const allocatePath = resolve(outDir, `category-repair-allocate-${stamp}.csv`);
  const recodePath = resolve(outDir, `category-repair-recode-${stamp}.csv`);

  writeCsv(
    stalePath,
    [
      'product_handle',
      'old_product_id',
      'new_product_id',
      'canonical_path',
      'category_path',
      'title',
      'vendor',
    ],
    staleRows.map((r) => [
      r.product_handle,
      r.old_product_id,
      r.new_product_id,
      r.canonical_path,
      r.category_path,
      r.title || '',
      r.vendor || '',
    ])
  );
  writeCsv(
    allocatePath,
    [
      'handle',
      'product_id',
      'title',
      'vendor',
      'product_type',
      'category_path',
      'canonical_path',
      'action',
    ],
    allocatePreview
  );
  writeCsv(
    recodePath,
    [
      'handle',
      'product_id',
      'title',
      'vendor',
      'product_type',
      'old_category_path',
      'new_category_path',
      'old_canonical_path',
      'new_canonical_path',
      'action',
    ],
    recodePreview
  );

  console.log('Preview');
  console.log(`  Stale IDs to repoint:     ${staleRows.length}`);
  console.log(`  Orphans to allocate:      ${allocatePreview.length}`);
  console.log(`  Unique mismatches:        ${recodePreview.length}`);
  console.log('');
  console.log('Wrote preview CSVs:');
  console.log(`  ${stalePath}`);
  console.log(`  ${allocatePath}`);
  console.log(`  ${recodePath}`);

  if (dryRun) {
    console.log('\nDry run — no database updates. Pass --apply to write.');
    return;
  }

  await ensureManualRedirects(sql);

  let repointed = 0;
  if (staleRows.length > 0) {
    const updated = (await sql`
      UPDATE product_category_assignments pca
      SET product_id = p.id, updated_at = NOW()
      FROM products p
      WHERE pca.product_handle = p.handle
        AND pca.product_id IS DISTINCT FROM p.id
      RETURNING pca.product_handle
    `) as unknown as Array<{ product_handle: string }>;
    repointed = Array.isArray(updated) ? updated.length : 0;

    await sql`
      UPDATE product_content_overrides pco
      SET product_id = p.id, updated_at = NOW()
      FROM products p
      WHERE pco.product_handle = p.handle
        AND (pco.product_id IS NULL OR pco.product_id IS DISTINCT FROM p.id)
    `;
  }

  let allocatedCount = 0;
  for (const row of allocatePreview) {
    const productId = row[1];
    const handle = row[0];
    const categoryPath = row[5];
    const { normalized, topLevel, parentCategory, subcategoryHandle } =
      splitCategoryPath(categoryPath);
    if (!topLevel) continue;
    const canonicalPath = normalizePath(`${normalized}/${handle}`);

    await sql`
      INSERT INTO product_category_assignments (
        product_id,
        product_handle,
        canonical_path,
        category_path,
        top_level,
        parent_category,
        subcategory_handle,
        updated_at
      )
      VALUES (
        ${productId},
        ${handle},
        ${canonicalPath},
        ${normalized},
        ${topLevel},
        ${parentCategory},
        ${subcategoryHandle},
        NOW()
      )
      ON CONFLICT (product_id) DO UPDATE
      SET product_handle = EXCLUDED.product_handle,
          canonical_path = EXCLUDED.canonical_path,
          category_path = EXCLUDED.category_path,
          top_level = EXCLUDED.top_level,
          parent_category = EXCLUDED.parent_category,
          subcategory_handle = EXCLUDED.subcategory_handle,
          updated_at = NOW()
    `;
    allocatedCount += 1;
  }

  let recodedCount = 0;
  for (const row of recodePreview) {
    const handle = row[0];
    const productId = row[1];
    const oldCanonical = row[7];
    const newCategory = row[6];
    const newCanonical = row[8];
    const { normalized, topLevel, parentCategory, subcategoryHandle } =
      splitCategoryPath(newCategory);
    if (!topLevel) continue;

    await sql`
      UPDATE product_category_assignments
      SET product_handle = ${handle},
          canonical_path = ${newCanonical},
          category_path = ${normalized},
          top_level = ${topLevel},
          parent_category = ${parentCategory},
          subcategory_handle = ${subcategoryHandle},
          updated_at = NOW()
      WHERE product_id = ${productId}
    `;

    if (oldCanonical && oldCanonical !== newCanonical) {
      await upsertManualRedirect(sql, oldCanonical, newCanonical);
    }
    recodedCount += 1;
  }

  console.log('\nApplied');
  console.log(`  Repointed IDs:   ${repointed}`);
  console.log(`  Allocated:       ${allocatedCount}`);
  console.log(`  Recoded:         ${recodedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
