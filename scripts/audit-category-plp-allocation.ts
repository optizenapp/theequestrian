#!/usr/bin/env tsx
/**
 * Audit category PLP health: Neon allocations vs published tree + collection_mapping.
 *
 * Usage:
 *   npx tsx scripts/audit-category-plp-allocation.ts --floral-prod
 *   npx tsx scripts/audit-category-plp-allocation.ts --floral-prod --min-leaf=5
 */
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

type ContentRow = {
  url_path: string;
  status: string;
  h1_title: string | null;
  category_level: number | null;
};

type MappingRow = {
  top_level: string;
  parent_category: string | null;
  subcategory_handle: string | null;
  product_type: string;
  action: string;
};

type AllocCountRow = {
  category_path: string;
  cnt: number;
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
  available_for_sale: boolean | null;
};

type AllocProductRow = {
  product_id: string;
  product_handle: string;
  category_path: string;
  canonical_path: string;
  product_type: string | null;
  title: string | null;
  vendor: string | null;
};

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

function mappingPath(row: MappingRow): string {
  const parts = [row.top_level, row.parent_category, row.subcategory_handle]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  return normalizePath(parts.join('/'));
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

function writeCsv(path: string, headers: string[], rows: string[][]): void {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map((cell) => csvEscape(cell)).join(','));
  }
  writeFileSync(path, `${lines.join('\n')}\n`);
}

async function main(): Promise<void> {
  const floralProd = process.argv.includes('--floral-prod');
  const minLeafArg = getArg('--min-leaf');
  const minLeaf = minLeafArg ? parseInt(minLeafArg, 10) : 5;
  if (!Number.isFinite(minLeaf) || minLeaf < 1) {
    throw new Error(`Invalid --min-leaf=${minLeafArg}`);
  }

  const sql = createSql(floralProd);
  console.log(`Category PLP allocation audit (${floralProd ? 'floral-prod' : 'local'})`);
  console.log(`  min-leaf: ${minLeaf}\n`);

  const contentRows = (await sql`
    SELECT url_path, status, h1_title, category_level
    FROM collection_content
    ORDER BY url_path
  `) as unknown as ContentRow[];

  const mappingRows = (await sql`
    SELECT top_level, parent_category, subcategory_handle, product_type, action
    FROM collection_mapping
    WHERE action != 'exclude'
    ORDER BY top_level, parent_category, subcategory_handle, product_type
  `) as unknown as MappingRow[];

  const leafCounts = (await sql`
    SELECT category_path, COUNT(*)::int AS cnt
    FROM product_category_assignments
    GROUP BY category_path
  `) as unknown as AllocCountRow[];

  const leafCountMap = new Map<string, number>();
  for (const row of leafCounts) {
    leafCountMap.set(normalizePath(row.category_path), Number(row.cnt));
  }

  const mappingCountByPath = new Map<string, number>();
  const typeToPaths = new Map<string, Set<string>>();
  for (const row of mappingRows) {
    const path = mappingPath(row);
    mappingCountByPath.set(path, (mappingCountByPath.get(path) || 0) + 1);
    const typeKey = row.product_type.trim().toLowerCase();
    if (!typeKey) continue;
    if (!typeToPaths.has(typeKey)) typeToPaths.set(typeKey, new Set());
    typeToPaths.get(typeKey)!.add(path);
  }

  const pathSet = new Set<string>();
  for (const row of contentRows) pathSet.add(normalizePath(row.url_path));
  for (const path of mappingCountByPath.keys()) pathSet.add(path);
  for (const path of leafCountMap.keys()) pathSet.add(path);

  const contentByPath = new Map<string, ContentRow>();
  for (const row of contentRows) {
    contentByPath.set(normalizePath(row.url_path), row);
  }

  const sortedPaths = [...pathSet].sort();
  const rollupCountMap = new Map<string, number>();
  for (const path of sortedPaths) {
    let rollup = 0;
    for (const [allocPath, count] of leafCountMap.entries()) {
      if (allocPath === path || allocPath.startsWith(path + '/')) {
        rollup += count;
      }
    }
    rollupCountMap.set(path, rollup);
  }

  const healthRows: string[][] = [];
  let publishedEmpty = 0;
  let thinLeafCount = 0;
  const thinLeafRows: string[][] = [];

  for (const path of sortedPaths) {
    const content = contentByPath.get(path);
    const leaf = leafCountMap.get(path) || 0;
    const rollup = rollupCountMap.get(path) || 0;
    const mapCount = mappingCountByPath.get(path) || 0;
    const level = pathLevel(path);
    const status = content?.status || '';
    const isPublished = status === 'published';
    const childOnly = rollup - leaf;
    const isEmpty = isPublished && leaf === 0 && rollup === 0;
    // Thin = few products at this path and no healthy child rollup
    const isThin =
      level >= 2 && leaf > 0 && leaf < minLeaf && childOnly === 0;
    if (isEmpty) publishedEmpty += 1;
    if (isThin) thinLeafCount += 1;

    const flags: string[] = [];
    if (isEmpty) flags.push('empty_published');
    if (isThin) flags.push('thin_leaf');
    if (!content && mapCount > 0) flags.push('mapping_only');
    if (content && mapCount === 0 && leaf === 0) flags.push('content_no_mapping');

    healthRows.push([
      path,
      status || '(none)',
      String(content?.category_level ?? level),
      String(leaf),
      String(rollup),
      String(mapCount),
      content?.h1_title || '',
      flags.join('|'),
    ]);

    if (isThin || (isPublished && leaf === 0 && rollup === 0 && level >= 2)) {
      thinLeafRows.push([
        path,
        parentOf(path),
        status || '(none)',
        String(level),
        String(leaf),
        String(rollup),
        String(mapCount),
        isThin ? 'thin' : 'empty',
        content?.h1_title || '',
      ]);
    }
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
      p.product_type,
      p.available_for_sale
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE pca.product_id IS NULL
      AND COALESCE(p.available_for_sale, true) = true
    ORDER BY p.handle
  `) as unknown as OrphanRow[];

  const allocatedProducts = (await sql`
    SELECT
      pca.product_id,
      pca.product_handle,
      pca.category_path,
      pca.canonical_path,
      p.product_type,
      p.title,
      p.vendor
    FROM product_category_assignments pca
    LEFT JOIN products p ON p.handle = pca.product_handle
    ORDER BY pca.product_handle
  `) as unknown as AllocProductRow[];

  const mismatchRows: string[][] = [];
  const unmappedTypeCounts = new Map<
    string,
    { count: number; sampleHandles: string[]; sampleVendors: string[] }
  >();

  for (const product of allocatedProducts) {
    const productType = (product.product_type || '').trim();
    if (!productType) {
      const key = '(empty)';
      const entry = unmappedTypeCounts.get(key) || {
        count: 0,
        sampleHandles: [],
        sampleVendors: [],
      };
      entry.count += 1;
      if (entry.sampleHandles.length < 5) {
        entry.sampleHandles.push(product.product_handle);
        entry.sampleVendors.push(product.vendor || '');
      }
      unmappedTypeCounts.set(key, entry);
      continue;
    }

    const paths = typeToPaths.get(productType.toLowerCase());
    if (!paths || paths.size === 0) {
      const key = productType;
      const entry = unmappedTypeCounts.get(key) || {
        count: 0,
        sampleHandles: [],
        sampleVendors: [],
      };
      entry.count += 1;
      if (entry.sampleHandles.length < 5) {
        entry.sampleHandles.push(product.product_handle);
        entry.sampleVendors.push(product.vendor || '');
      }
      unmappedTypeCounts.set(key, entry);
      continue;
    }

    if (paths.size === 1) {
      const mappedPath = [...paths][0];
      const current = normalizePath(product.category_path || '');
      if (mappedPath !== current) {
        const currentUnderMapped =
          current === mappedPath || current.startsWith(mappedPath + '/');
        const mappedUnderCurrent = mappedPath.startsWith(current + '/');
        let status = 'unique_mismatch';
        if (currentUnderMapped) status = 'deeper_leaf_ok';
        else if (mappedUnderCurrent) status = 'recode_deepen';
        mismatchRows.push([
          product.product_handle,
          product.product_id,
          product.title || '',
          product.vendor || '',
          productType,
          current,
          mappedPath,
          product.canonical_path || '',
          status,
        ]);
      }
    }
  }

  // Orphans: classify mapped / unmapped / ambiguous for repair preview
  const orphanCsvRows: string[][] = [];
  for (const orphan of orphanRows) {
    const productType = (orphan.product_type || '').trim();
    const paths = productType
      ? typeToPaths.get(productType.toLowerCase())
      : undefined;
    let resolveStatus = 'unmapped';
    let mappedPath = '';
    if (paths && paths.size === 1) {
      resolveStatus = 'unique_mappable';
      mappedPath = [...paths][0];
    } else if (paths && paths.size > 1) {
      resolveStatus = 'ambiguous';
      mappedPath = [...paths].sort().join('|');
    }
    orphanCsvRows.push([
      orphan.handle,
      orphan.product_id,
      orphan.title || '',
      orphan.vendor || '',
      productType,
      orphan.available_for_sale ? 'true' : 'false',
      resolveStatus,
      mappedPath,
    ]);
  }

  const unmappedTypeRows: string[][] = [];
  for (const [productType, info] of [...unmappedTypeCounts.entries()].sort(
    (a, b) => b[1].count - a[1].count
  )) {
    unmappedTypeRows.push([
      productType,
      String(info.count),
      info.sampleHandles.join('|'),
      info.sampleVendors.join('|'),
    ]);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = resolve(process.cwd(), 'exports');
  mkdirSync(outDir, { recursive: true });

  const healthPath = resolve(outDir, `category-plp-health-${stamp}.csv`);
  const stalePath = resolve(outDir, `category-stale-ids-${stamp}.csv`);
  const orphanPath = resolve(outDir, `category-orphans-${stamp}.csv`);
  const mismatchPath = resolve(outDir, `category-type-mismatch-${stamp}.csv`);
  const unmappedPath = resolve(outDir, `category-unmapped-types-${stamp}.csv`);
  const thinPath = resolve(outDir, `category-thin-leaves-${stamp}.csv`);

  writeCsv(
    healthPath,
    [
      'path',
      'content_status',
      'level',
      'leaf_count',
      'rollup_count',
      'mapping_row_count',
      'h1_title',
      'flags',
    ],
    healthRows
  );

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
    orphanPath,
    [
      'handle',
      'product_id',
      'title',
      'vendor',
      'product_type',
      'available_for_sale',
      'resolve_status',
      'mapped_path',
    ],
    orphanCsvRows
  );

  writeCsv(
    mismatchPath,
    [
      'handle',
      'product_id',
      'title',
      'vendor',
      'product_type',
      'current_category_path',
      'mapped_category_path',
      'canonical_path',
      'status',
    ],
    mismatchRows
  );

  writeCsv(
    unmappedPath,
    ['product_type', 'allocated_count', 'sample_handles', 'sample_vendors'],
    unmappedTypeRows
  );

  writeCsv(
    thinPath,
    [
      'path',
      'proposed_merge_to',
      'content_status',
      'level',
      'leaf_count',
      'rollup_count',
      'mapping_row_count',
      'reason',
      'h1_title',
    ],
    thinLeafRows
  );

  const uniqueMappableOrphans = orphanCsvRows.filter((r) => r[6] === 'unique_mappable').length;

  console.log('Summary');
  console.log(`  Paths scanned:              ${sortedPaths.length}`);
  console.log(`  Published empty:            ${publishedEmpty}`);
  console.log(`  Thin leaves (<${minLeaf}):         ${thinLeafCount}`);
  console.log(`  Thin/empty prune candidates:${thinLeafRows.length}`);
  console.log(`  Stale allocation IDs:       ${staleRows.length}`);
  console.log(`  Orphans (available):        ${orphanRows.length}`);
  console.log(`    unique-mappable:          ${uniqueMappableOrphans}`);
  const trueMismatches = mismatchRows.filter((r) => r[8] === 'unique_mismatch').length;
  const deeperOk = mismatchRows.filter((r) => r[8] === 'deeper_leaf_ok').length;
  const deepen = mismatchRows.filter((r) => r[8] === 'recode_deepen').length;
  console.log(`  Type path diffs:            ${mismatchRows.length}`);
  console.log(`    recode_deepen (repair):   ${deepen}`);
  console.log(`    unique_mismatch (review): ${trueMismatches}`);
  console.log(`    deeper_leaf_ok (keep):    ${deeperOk}`);
  console.log(`  Unmapped product types:     ${unmappedTypeRows.length}`);
  console.log('');
  console.log('Wrote:');
  console.log(`  ${healthPath}`);
  console.log(`  ${stalePath}`);
  console.log(`  ${orphanPath}`);
  console.log(`  ${mismatchPath}`);
  console.log(`  ${unmappedPath}`);
  console.log(`  ${thinPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
