#!/usr/bin/env tsx
/**
 * Validate category-mismatch-review CSV paths against published collection_content.
 */
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

type ReviewRow = {
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  current_category_path: string;
  mapped_category_path: string;
  verdict: string;
  correct_category_path: string;
  notes: string;
  product_id: string;
  canonical_path: string;
};

function normalizePath(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

async function main() {
  const floralProd = process.argv.includes('--floral-prod');
  const sql = createSql(floralProd);
  const csvPath = resolve(
    process.cwd(),
    'exports/category-mismatch-review-2026-08-14T01-08-27.csv'
  );
  const rows = parse(readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as ReviewRow[];

  const content = (await sql`
    SELECT url_path, status, h1_title
    FROM collection_content
  `) as Array<{ url_path: string; status: string; h1_title: string | null }>;

  const byPath = new Map<string, { status: string; h1: string }>();
  for (const row of content) {
    byPath.set(normalizePath(row.url_path), {
      status: row.status,
      h1: row.h1_title || '',
    });
  }

  const mappingPaths = (await sql`
    SELECT DISTINCT
      '/' || TRIM(BOTH '/' FROM CONCAT_WS('/',
        NULLIF(TRIM(top_level), ''),
        NULLIF(TRIM(parent_category), ''),
        NULLIF(TRIM(subcategory_handle), '')
      )) AS path
    FROM collection_mapping
    WHERE action != 'exclude'
  `) as Array<{ path: string }>;
  const mappingSet = new Set(
    mappingPaths.map((r) => normalizePath(r.path)).filter(Boolean)
  );

  let correct = 0;
  let incorrect = 0;
  let blankVerdict = 0;
  let moveReady = 0;
  let noopIncorrect = 0;
  let needsNewCategory = 0;
  let missingPath = 0;

  const suggestedPaths = new Map<
    string,
    { count: number; notes: Set<string>; exists: string; published: boolean }
  >();

  const actionRows: Array<Record<string, string>> = [];

  for (const row of rows) {
    const verdict = (row.verdict || '').trim().toLowerCase();
    const suggested = normalizePath(row.correct_category_path || '');
    const current = normalizePath(row.current_category_path || '');
    const notes = (row.notes || '').trim();

    if (verdict === 'correct' || verdict === 'correct') correct += 1;
    else if (verdict === 'incorrect') incorrect += 1;
    else blankVerdict += 1;

    if (suggested) {
      const info = byPath.get(suggested);
      const exists = !info
        ? mappingSet.has(suggested)
          ? 'mapping_only'
          : 'MISSING'
        : info.status;
      const published = info?.status === 'published';
      const entry = suggestedPaths.get(suggested) || {
        count: 0,
        notes: new Set<string>(),
        exists,
        published,
      };
      entry.count += 1;
      if (notes) entry.notes.add(notes);
      entry.exists = exists;
      entry.published = published;
      suggestedPaths.set(suggested, entry);
    }

    const needsCategory =
      /need a category|do we have this|need a category path/i.test(notes);

    if (needsCategory) needsNewCategory += 1;

    // Actionable moves: incorrect (or blank+path) with a different target path
    const wantsMove =
      (verdict === 'incorrect' || (!verdict && suggested)) &&
      suggested &&
      suggested !== current;

    if (verdict === 'incorrect' && (!suggested || suggested === current)) {
      if (!needsCategory) noopIncorrect += 1;
    }

    if (wantsMove) {
      const info = byPath.get(suggested);
      const pathStatus = !info
        ? mappingSet.has(suggested)
          ? 'mapping_only'
          : 'MISSING'
        : info.status;
      if (pathStatus === 'MISSING' || pathStatus === 'draft') missingPath += 1;
      else moveReady += 1;

      actionRows.push({
        handle: row.handle,
        title: row.title,
        current_category_path: current,
        correct_category_path: suggested,
        path_status: pathStatus,
        notes,
        product_id: row.product_id,
        canonical_path: row.canonical_path,
        apply: pathStatus === 'published' || pathStatus === 'mapping_only' ? 'yes' : 'blocked',
      });
    }
  }

  console.log('Review summary');
  console.log(`  Total rows:              ${rows.length}`);
  console.log(`  verdict=correct:         ${correct}`);
  console.log(`  verdict=incorrect:       ${incorrect}`);
  console.log(`  blank verdict:           ${blankVerdict}`);
  console.log(`  notes asking new path:   ${needsNewCategory}`);
  console.log(`  incorrect with no move:  ${noopIncorrect} (same path / no path)`);
  console.log(`  actionable moves:        ${actionRows.length}`);
  console.log(`    path OK to apply:      ${moveReady}`);
  console.log(`    path missing/draft:    ${missingPath}`);
  console.log('');
  console.log('Suggested correct_category_path existence:');
  for (const [path, info] of [...suggestedPaths.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const note = [...info.notes].join(' | ');
    console.log(
      `  ${path}  ×${info.count}  [${info.exists}]${note ? `  notes: ${note}` : ''}`
    );
  }

  // Nearby path suggestions for missing ones
  console.log('\nNearby existing paths for missing suggestions:');
  for (const [path, info] of suggestedPaths.entries()) {
    if (info.exists === 'published') continue;
    const prefix = path.split('/').slice(0, 3).join('/');
    const nearby = [...byPath.entries()]
      .filter(([p, v]) => v.status === 'published' && (p.startsWith(prefix) || path.startsWith(p)))
      .map(([p]) => p)
      .sort()
      .slice(0, 12);
    console.log(`  ${path} → nearby: ${nearby.join(', ') || '(none)'}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = resolve(process.cwd(), 'exports', `category-mismatch-apply-plan-${stamp}.csv`);
  writeFileSync(out, stringify(actionRows, { header: true }));
  console.log(`\nWrote apply plan: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
