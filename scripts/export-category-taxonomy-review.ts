#!/usr/bin/env tsx
/**
 * Export category/subcategory taxonomy for pill + SEO naming review.
 *
 * Usage:
 *   npx tsx scripts/export-category-taxonomy-review.ts --floral-prod
 */
import { config } from 'dotenv';
import { mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { stringify } from 'csv-stringify/sync';
import { createSql } from './brand-page-pipeline/db';
import { resolvePillAnchorText } from '../lib/seo/pill-anchor-text';

config({ path: resolve(process.cwd(), '.env.local') });

type ContentRow = {
  url_path: string;
  status: string;
  parent_url: string | null;
  category_level: number | null;
  breadcrumb_label: string | null;
  h1_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

type AllocCountRow = {
  category_path: string;
  cnt: number;
};

const TOP_LEVEL = new Set(['horse', 'rider', 'clothing', 'pet', 'accessories']);

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

function lastSegment(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function parentOf(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  if (parts.length <= 1) return '';
  return '/' + parts.slice(0, -1).join('/');
}

function depth(path: string): number {
  return normalizePath(path).split('/').filter(Boolean).length;
}

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const sql = createSql(floralProd);

  console.log(`Category taxonomy review export (${floralProd ? 'floral-prod' : 'local'})\n`);

  const content = (await sql`
    SELECT
      url_path, status, parent_url, category_level,
      breadcrumb_label, h1_title, meta_title, meta_description
    FROM collection_content
    ORDER BY url_path
  `) as unknown as ContentRow[];

  const leafCounts = (await sql`
    SELECT category_path, COUNT(*)::int AS cnt
    FROM product_category_assignments
    GROUP BY category_path
  `) as unknown as AllocCountRow[];

  const leafMap = new Map<string, number>();
  for (const row of leafCounts) {
    leafMap.set(normalizePath(row.category_path), Number(row.cnt));
  }

  const catalog = content.filter((row) => {
    const path = normalizePath(row.url_path);
    const top = path.split('/').filter(Boolean)[0];
    return TOP_LEVEL.has(top || '');
  });

  const publishedPaths = new Set(
    catalog
      .filter((row) => row.status === 'published')
      .map((row) => normalizePath(row.url_path))
  );

  const rows = catalog.map((row) => {
    const path = normalizePath(row.url_path);
    const parent = normalizePath(row.parent_url || '') || parentOf(path);
    const handle = lastSegment(path);
    const level = row.category_level || depth(path);
    const leaf = leafMap.get(path) || 0;
    let rollup = 0;
    for (const [allocPath, count] of leafMap.entries()) {
      if (allocPath === path || allocPath.startsWith(`${path}/`)) rollup += count;
    }
    const rawPill = (row.breadcrumb_label || row.h1_title || handle).trim();
    const pillTitle =
      level === 1
        ? rawPill
        : resolvePillAnchorText({
            basePath: parent || '/',
            handle,
            label: rawPill,
          });
    const parentPublished = !parent || publishedPaths.has(parent);
    const showsAsPill =
      row.status === 'published' && parentPublished && level > 1 && rollup > 0;

    return {
      path,
      parent_path: parent || '',
      level,
      status: row.status,
      handle,
      leaf_products: leaf,
      rollup_products: rollup,
      shows_as_pill: showsAsPill ? 'yes' : 'no',
      empty_published: row.status === 'published' && rollup === 0 ? 'yes' : 'no',
      pill_title: pillTitle,
      breadcrumb_label: row.breadcrumb_label || '',
      h1: row.h1_title || '',
      seo_title: row.meta_title || '',
      seo_description: (row.meta_description || '').replace(/\s+/g, ' ').trim(),
    };
  });

  rows.sort((a, b) => a.path.localeCompare(b.path));

  const headers = [
    'path',
    'parent_path',
    'level',
    'status',
    'handle',
    'leaf_products',
    'rollup_products',
    'shows_as_pill',
    'empty_published',
    'pill_title',
    'breadcrumb_label',
    'h1',
    'seo_title',
    'seo_description',
  ];

  const csv = stringify(rows, { header: true, columns: headers });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  const stamped = resolve(process.cwd(), `exports/category-taxonomy-review-${stamp}.csv`);
  const stable = resolve(process.cwd(), 'exports/category-taxonomy-review.csv');
  writeFileSync(stamped, csv);
  copyFileSync(stamped, stable);

  const published = rows.filter((r) => r.status === 'published');
  const emptyPub = published.filter((r) => r.empty_published === 'yes');
  const pills = published.filter((r) => r.shows_as_pill === 'yes');

  console.log(`Wrote ${stable}`);
  console.log(`  rows: ${rows.length} (published ${published.length}, draft ${rows.length - published.length})`);
  console.log(`  empty published: ${emptyPub.length}`);
  console.log(`  currently show as child pills: ${pills.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
