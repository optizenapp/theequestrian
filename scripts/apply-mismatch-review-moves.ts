#!/usr/bin/env tsx
/**
 * Apply remaining mismatch-review moves where correct_category_path exists + published.
 *
 * Usage:
 *   npx tsx scripts/apply-mismatch-review-moves.ts --floral-prod
 *   npx tsx scripts/apply-mismatch-review-moves.ts --floral-prod --apply
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
  verdict: string;
  correct_category_path: string;
  notes: string;
  product_id: string;
  canonical_path: string;
  current_category_path: string;
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

async function main() {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Apply mismatch review moves');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

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
    SELECT url_path, status FROM collection_content
  `) as Array<{ url_path: string; status: string }>;
  const published = new Set(
    content
      .filter((c) => c.status === 'published')
      .map((c) => normalizePath(c.url_path))
  );

  // Path remaps from work already done this session
  const pathAliases: Record<string, string> = {
    '/clothing/childrens/breeches': '/clothing/kids/breeches',
    '/horse/veterinary/supplements': '/horse/supplements',
    '/horse/tack/stirrups': '/horse/tack/stirrups', // already consolidated
  };

  const plan: Array<{
    handle: string;
    title: string;
    from: string;
    to: string;
    product_id: string;
    canonical_path: string;
    status: string;
  }> = [];

  for (const row of rows) {
    const verdict = (row.verdict || '').trim().toLowerCase();
    let suggested = normalizePath(row.correct_category_path || '');
    if (pathAliases[suggested]) suggested = pathAliases[suggested];

    const wantsMove =
      (verdict === 'incorrect' || (!verdict && suggested)) && Boolean(suggested);
    if (!wantsMove) continue;

    // Live current path from DB (CSV may be stale)
    const live = (await sql`
      SELECT product_id, product_handle, category_path, canonical_path
      FROM product_category_assignments
      WHERE product_handle = ${row.handle}
      LIMIT 1
    `) as Array<{
      product_id: string;
      product_handle: string;
      category_path: string;
      canonical_path: string;
    }>;

    if (!live.length) {
      plan.push({
        handle: row.handle,
        title: row.title,
        from: '(missing allocation)',
        to: suggested,
        product_id: row.product_id,
        canonical_path: row.canonical_path,
        status: 'missing_allocation',
      });
      continue;
    }

    const current = normalizePath(live[0].category_path);
    if (current === suggested) {
      plan.push({
        handle: row.handle,
        title: row.title,
        from: current,
        to: suggested,
        product_id: live[0].product_id,
        canonical_path: live[0].canonical_path,
        status: 'already_done',
      });
      continue;
    }

    if (!published.has(suggested)) {
      plan.push({
        handle: row.handle,
        title: row.title,
        from: current,
        to: suggested,
        product_id: live[0].product_id,
        canonical_path: live[0].canonical_path,
        status: 'path_not_published',
      });
      continue;
    }

    plan.push({
      handle: row.handle,
      title: row.title,
      from: current,
      to: suggested,
      product_id: live[0].product_id,
      canonical_path: live[0].canonical_path,
      status: 'ready',
    });
  }

  const ready = plan.filter((p) => p.status === 'ready');
  const already = plan.filter((p) => p.status === 'already_done');
  const blocked = plan.filter((p) => p.status === 'path_not_published');
  const missing = plan.filter((p) => p.status === 'missing_allocation');

  console.log(`Ready to move:     ${ready.length}`);
  console.log(`Already done:      ${already.length}`);
  console.log(`Path not live:     ${blocked.length}`);
  console.log(`Missing alloc:     ${missing.length}\n`);

  for (const p of ready) {
    console.log(`  ${p.handle}: ${p.from} → ${p.to}`);
  }
  if (blocked.length) {
    console.log('\nBlocked:');
    for (const p of blocked) console.log(`  ${p.handle}: ${p.from} → ${p.to}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = resolve(
    process.cwd(),
    'exports',
    `category-mismatch-apply-remaining-${stamp}.csv`
  );
  writeFileSync(out, stringify(plan, { header: true }));
  console.log(`\nWrote ${out}`);

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

  let moved = 0;
  for (const p of ready) {
    const parts = splitCategoryPath(p.to);
    if (!parts.topLevel) continue;
    const newCanonical = normalizePath(`${parts.normalized}/${p.handle}`);
    await sql`
      UPDATE product_category_assignments
      SET canonical_path = ${newCanonical},
          category_path = ${parts.normalized},
          top_level = ${parts.topLevel},
          parent_category = ${parts.parentCategory},
          subcategory_handle = ${parts.subcategoryHandle},
          updated_at = NOW()
      WHERE product_id = ${p.product_id}
    `;
    if (p.canonical_path && p.canonical_path !== newCanonical) {
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${p.canonical_path}, ${newCanonical}, '301', 'apply-mismatch-review-moves', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'apply-mismatch-review-moves',
            status = 'active',
            updated_at = NOW()
      `;
    }
    moved += 1;
    console.log(`Moved ${p.handle}`);
  }

  console.log(`\nDone. moved=${moved}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
