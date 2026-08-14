#!/usr/bin/env tsx
/**
 * Prune thin/empty category leaves into their parent.
 *
 * - Move allocations from leaf → parent
 * - 301 leaf → parent via manual_redirects
 * - Draft collection_content for the leaf
 * - Exclude collection_mapping rows that only served the dead leaf
 *
 * Usage:
 *   npx tsx scripts/apply-category-leaf-prune.ts --floral-prod
 *   npx tsx scripts/apply-category-leaf-prune.ts --floral-prod --apply
 *   npx tsx scripts/apply-category-leaf-prune.ts --floral-prod --apply --min-leaf=5
 *   npx tsx scripts/apply-category-leaf-prune.ts --floral-prod --apply --from-csv=exports/category-thin-leaves-....csv
 */
import { config } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

type ContentRow = {
  url_path: string;
  status: string;
};

type AllocCountRow = {
  category_path: string;
  cnt: number;
};

type MappingRow = {
  id: number;
  top_level: string;
  parent_category: string | null;
  subcategory_handle: string | null;
  product_type: string;
  action: string;
};

type AllocRow = {
  product_id: string;
  product_handle: string;
  canonical_path: string;
  category_path: string;
};

type PruneCandidate = {
  path: string;
  proposedMergeTo: string;
  contentStatus: string;
  level: number;
  leafCount: number;
  rollupCount: number;
  reason: string;
};

const TOP_LEVEL = new Set(['horse', 'rider', 'clothing', 'pet', 'accessories']);

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.split('=').slice(1).join('=');
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

function parentOf(path: string): string {
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) return normalized;
  return '/' + segments.slice(0, -1).join('/');
}

function pathLevel(path: string): number {
  return normalizePath(path).split('/').filter(Boolean).length;
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

function loadCandidatesFromCsv(filePath: string): PruneCandidate[] {
  const absolute = resolve(process.cwd(), filePath);
  if (!existsSync(absolute)) {
    throw new Error(`CSV not found: ${absolute}`);
  }
  const records = parse(readFileSync(absolute, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  return records.map((r) => ({
    path: normalizePath(r.path || ''),
    proposedMergeTo: normalizePath(r.proposed_merge_to || parentOf(r.path || '')),
    contentStatus: r.content_status || '',
    level: Number(r.level || pathLevel(r.path || '')),
    leafCount: Number(r.leaf_count || 0),
    rollupCount: Number(r.rollup_count || 0),
    reason: r.reason || '',
  }));
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
    VALUES (${fromPath}, ${toPath}, '301', 'category-leaf-prune', 'active', NOW())
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = '301',
        source = 'category-leaf-prune',
        status = 'active',
        updated_at = NOW()
  `;
}

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const minLeafArg = getArg('--min-leaf');
  const minLeaf = minLeafArg ? parseInt(minLeafArg, 10) : 5;
  const fromCsv = getArg('--from-csv');
  const sql = createSql(floralProd);

  console.log('Category leaf prune');
  console.log(`  DB:       ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode:     ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`  min-leaf: ${minLeaf}`);
  if (fromCsv) console.log(`  from-csv: ${fromCsv}`);
  console.log('');

  let candidates: PruneCandidate[];

  if (fromCsv) {
    candidates = loadCandidatesFromCsv(fromCsv);
  } else {
    const contentRows = (await sql`
      SELECT url_path, status
      FROM collection_content
      WHERE status = 'published'
      ORDER BY url_path
    `) as unknown as ContentRow[];

    const leafCounts = (await sql`
      SELECT category_path, COUNT(*)::int AS cnt
      FROM product_category_assignments
      GROUP BY category_path
    `) as unknown as AllocCountRow[];

    const leafCountMap = new Map<string, number>();
    for (const row of leafCounts) {
      leafCountMap.set(normalizePath(row.category_path), Number(row.cnt));
    }

    const paths = contentRows.map((r) => normalizePath(r.url_path));
    const rollupCountMap = new Map<string, number>();
    for (const path of paths) {
      let rollup = 0;
      for (const [allocPath, count] of leafCountMap.entries()) {
        if (allocPath === path || allocPath.startsWith(path + '/')) {
          rollup += count;
        }
      }
      rollupCountMap.set(path, rollup);
    }

    candidates = [];
    for (const row of contentRows) {
      const path = normalizePath(row.url_path);
      const level = pathLevel(path);
      if (level < 2) continue;
      const leaf = leafCountMap.get(path) || 0;
      const rollup = rollupCountMap.get(path) || 0;
      const top = path.split('/').filter(Boolean)[0];
      if (!TOP_LEVEL.has(top)) continue;

      // Never prune a parent that still has healthy child rollup beyond its own leaf
      const childOnly = rollup - leaf;
      if (childOnly > 0 && rollup >= minLeaf) continue;

      if (leaf === 0 && rollup === 0) {
        candidates.push({
          path,
          proposedMergeTo: parentOf(path),
          contentStatus: row.status,
          level,
          leafCount: leaf,
          rollupCount: rollup,
          reason: 'empty',
        });
      } else if (leaf > 0 && leaf < minLeaf && childOnly === 0) {
        candidates.push({
          path,
          proposedMergeTo: parentOf(path),
          contentStatus: row.status,
          level,
          leafCount: leaf,
          rollupCount: rollup,
          reason: 'thin',
        });
      }
    }
  }

  // Safety filters
  candidates = candidates.filter((c) => {
    const level = pathLevel(c.path);
    if (level < 2) return false;
    const top = c.path.split('/').filter(Boolean)[0];
    if (!TOP_LEVEL.has(top)) return false;
    if (normalizePath(c.proposedMergeTo) === normalizePath(c.path)) return false;
    if (pathLevel(c.proposedMergeTo) < 1) return false;
    return true;
  });

  // Deepest first so nested leaves move before parents
  candidates.sort((a, b) => pathLevel(b.path) - pathLevel(a.path) || a.path.localeCompare(b.path));

  const previewRows: string[][] = candidates.map((c) => [
    c.path,
    c.proposedMergeTo,
    c.contentStatus,
    String(c.level),
    String(c.leafCount),
    String(c.rollupCount),
    c.reason,
  ]);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = resolve(process.cwd(), 'exports');
  mkdirSync(outDir, { recursive: true });
  const previewPath = resolve(outDir, `category-prune-preview-${stamp}.csv`);
  writeCsv(
    previewPath,
    [
      'path',
      'proposed_merge_to',
      'content_status',
      'level',
      'leaf_count',
      'rollup_count',
      'reason',
    ],
    previewRows
  );

  console.log(`Prune candidates: ${candidates.length}`);
  console.log(`Wrote ${previewPath}`);

  if (dryRun) {
    console.log('\nDry run — no database updates. Pass --apply to write.');
    return;
  }

  await ensureManualRedirects(sql);

  let movedAllocations = 0;
  let draftedPages = 0;
  let redirects = 0;
  let excludedMappings = 0;

  for (const candidate of candidates) {
    const leafPath = normalizePath(candidate.path);
    const parentPath = normalizePath(candidate.proposedMergeTo);
    const parentParts = splitCategoryPath(parentPath);
    if (!parentParts.topLevel) continue;

    const allocations = (await sql`
      SELECT product_id, product_handle, canonical_path, category_path
      FROM product_category_assignments
      WHERE category_path = ${leafPath}
      ORDER BY product_handle
    `) as unknown as AllocRow[];

    for (const alloc of allocations) {
      const newCanonical = normalizePath(`${parentPath}/${alloc.product_handle}`);
      await sql`
        UPDATE product_category_assignments
        SET canonical_path = ${newCanonical},
            category_path = ${parentParts.normalized},
            top_level = ${parentParts.topLevel},
            parent_category = ${parentParts.parentCategory},
            subcategory_handle = ${parentParts.subcategoryHandle},
            updated_at = NOW()
        WHERE product_id = ${alloc.product_id}
      `;
      if (alloc.canonical_path !== newCanonical) {
        await upsertManualRedirect(sql, alloc.canonical_path, newCanonical);
        redirects += 1;
      }
      movedAllocations += 1;
    }

    await upsertManualRedirect(sql, leafPath, parentPath);
    redirects += 1;

    const drafted = (await sql`
      UPDATE collection_content
      SET status = 'draft', updated_at = NOW()
      WHERE url_path = ${leafPath}
        AND status = 'published'
      RETURNING url_path
    `) as unknown as Array<{ url_path: string }>;
    if (Array.isArray(drafted) && drafted.length > 0) draftedPages += 1;

    const mappingRows = (await sql`
      SELECT id, top_level, parent_category, subcategory_handle, product_type, action
      FROM collection_mapping
      WHERE action != 'exclude'
    `) as unknown as MappingRow[];

    for (const row of mappingRows) {
      if (mappingPath(row) !== leafPath) continue;
      await sql`
        UPDATE collection_mapping
        SET action = 'exclude',
            notes = COALESCE(notes, '') || ' [excluded by category-leaf-prune]',
            updated_at = NOW()
        WHERE id = ${row.id}
      `;
      excludedMappings += 1;
    }

    console.log(
      `[pruned] ${leafPath} → ${parentPath} (moved ${allocations.length}, drafted=${Array.isArray(drafted) && drafted.length > 0})`
    );
  }

  console.log('\nApplied');
  console.log(`  Leaves pruned:      ${candidates.length}`);
  console.log(`  Allocations moved:  ${movedAllocations}`);
  console.log(`  Pages drafted:      ${draftedPages}`);
  console.log(`  Redirects upserted: ${redirects}`);
  console.log(`  Mappings excluded:  ${excludedMappings}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
