#!/usr/bin/env tsx
/**
 * Audit published categories for near-duplicates / overlapping leaves.
 *
 * Usage:
 *   npx tsx scripts/audit-duplicate-categories.ts --floral-prod
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
  breadcrumb_label: string | null;
  parent_url: string | null;
  category_level: number | null;
};

type AllocCount = { category_path: string; c: number };

function normalizePath(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function lastSegment(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function parentPath(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

function singularize(slug: string): string {
  if (slug.endsWith('ies') && slug.length > 4) return slug.slice(0, -3) + 'y';
  if (slug.endsWith('sses')) return slug.slice(0, -2);
  if (slug.endsWith('s') && !slug.endsWith('ss') && slug.length > 3) {
    return slug.slice(0, -1);
  }
  return slug;
}

function tokenize(slug: string): Set<string> {
  return new Set(
    slug
      .split('-')
      .map((t) => singularize(t))
      .filter((t) => t.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function main() {
  const floralProd = process.argv.includes('--floral-prod');
  const sql = createSql(floralProd);

  console.log(`Duplicate category audit (${floralProd ? 'floral-prod' : 'local'})\n`);

  const content = (await sql`
    SELECT url_path, status, h1_title, breadcrumb_label, parent_url, category_level
    FROM collection_content
    WHERE status = 'published'
    ORDER BY url_path
  `) as unknown as ContentRow[];

  const counts = (await sql`
    SELECT category_path, COUNT(*)::int AS c
    FROM product_category_assignments
    GROUP BY category_path
  `) as unknown as AllocCount[];
  const countMap = new Map(
    counts.map((r) => [normalizePath(r.category_path), Number(r.c)])
  );

  const paths = content.map((c) => ({
    path: normalizePath(c.url_path),
    h1: c.h1_title || '',
    breadcrumb: c.breadcrumb_label || '',
    parent: normalizePath(c.parent_url || parentPath(c.url_path)),
    level: Number(c.category_level || normalizePath(c.url_path).split('/').filter(Boolean).length),
    leaf: countMap.get(normalizePath(c.url_path)) || 0,
    rollup: 0,
  }));

  for (const row of paths) {
    let rollup = row.leaf;
    for (const other of paths) {
      if (other.path !== row.path && other.path.startsWith(row.path + '/')) {
        rollup += other.leaf;
      }
    }
    // also count allocations under unpublished children
    for (const [allocPath, c] of countMap.entries()) {
      if (allocPath.startsWith(row.path + '/')) {
        const hasPublishedChild = paths.some((p) => p.path === allocPath);
        if (!hasPublishedChild && allocPath !== row.path) {
          // already included via leaf of children only if published; add orphan allocs once
        }
      }
    }
    // simpler rollup from all allocations
    let allocRollup = 0;
    for (const [allocPath, c] of countMap.entries()) {
      if (allocPath === row.path || allocPath.startsWith(row.path + '/')) {
        allocRollup += c;
      }
    }
    row.rollup = allocRollup;
  }

  type Pair = {
    path_a: string;
    path_b: string;
    reason: string;
    score: number;
    leaf_a: number;
    leaf_b: number;
    rollup_a: number;
    rollup_b: number;
    h1_a: string;
    h1_b: string;
    suggested_keep: string;
    suggested_action: string;
  };

  const pairs: Pair[] = [];
  const seen = new Set<string>();

  function addPair(
    a: (typeof paths)[0],
    b: (typeof paths)[0],
    reason: string,
    score: number,
    action: string
  ) {
    const [x, y] = a.path < b.path ? [a, b] : [b, a];
    const key = `${x.path}|${y.path}|${reason}`;
    if (seen.has(key)) return;
    seen.add(key);

    // Prefer keep deeper/more specific with more products, else shorter cleaner slug
    let keep = a.path;
    if (b.leaf > a.leaf) keep = b.path;
    else if (b.leaf === a.leaf && b.path.length <= a.path.length) keep = b.path;

    pairs.push({
      path_a: a.path,
      path_b: b.path,
      reason,
      score,
      leaf_a: a.leaf,
      leaf_b: b.leaf,
      rollup_a: a.rollup,
      rollup_b: b.rollup,
      h1_a: a.h1,
      h1_b: b.h1,
      suggested_keep: keep,
      suggested_action: action,
    });
  }

  // 1) Exact last-segment duplicates under different parents
  // Skip intentional shared leaf names (accessories, gender trees, discipline splits)
  // Must match singularize(lastSegment(...)) — e.g. accessories → accessory
  const intentionalSharedLeaves = new Set([
    'accessory',
    'breeche',
    'boot',
    'top',
    'jacket',
    'dressage',
    'jumping',
  ]);
  const bySegment = new Map<string, typeof paths>();
  for (const p of paths) {
    const seg = singularize(lastSegment(p.path));
    if (!bySegment.has(seg)) bySegment.set(seg, []);
    bySegment.get(seg)!.push(p);
  }
  for (const [seg, group] of bySegment.entries()) {
    if (group.length < 2) continue;
    if (seg.length < 3) continue;
    if (intentionalSharedLeaves.has(seg)) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        addPair(
          group[i],
          group[j],
          'same_leaf_slug_different_parent',
          0.95,
          'pick_one_canonical_redirect_other'
        );
      }
    }
  }

  // 2) Singular/plural siblings under same parent
  const byParent = new Map<string, typeof paths>();
  for (const p of paths) {
    if (!byParent.has(p.parent)) byParent.set(p.parent, []);
    byParent.get(p.parent)!.push(p);
  }
  for (const group of byParent.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = singularize(lastSegment(group[i].path));
        const b = singularize(lastSegment(group[j].path));
        if (a && a === b && lastSegment(group[i].path) !== lastSegment(group[j].path)) {
          addPair(
            group[i],
            group[j],
            'singular_plural_siblings',
            0.98,
            'merge_to_preferred_slug'
          );
        }
      }
    }
  }

  // 3) Near-duplicate H1 / breadcrumb labels
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const a = paths[i];
      const b = paths[j];
      const ha = slugify(a.h1 || a.breadcrumb);
      const hb = slugify(b.h1 || b.breadcrumb);
      if (!ha || !hb) continue;
      if (ha === hb) {
        addPair(a, b, 'identical_h1_slug', 0.97, 'merge_or_differentiate_copy');
        continue;
      }
      const score = jaccard(tokenize(ha), tokenize(hb));
      const sameTop =
        a.path.split('/')[1] && a.path.split('/')[1] === b.path.split('/')[1];
      if (score >= 0.7 && sameTop) {
        addPair(a, b, 'similar_h1', Number(score.toFixed(2)), 'review_overlap');
      }
    }
  }

  // 4) Same parent + high slug token overlap
  for (const group of byParent.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const score = jaccard(
          tokenize(lastSegment(a.path)),
          tokenize(lastSegment(b.path))
        );
        if (score >= 0.66 && lastSegment(a.path) !== lastSegment(b.path)) {
          addPair(a, b, 'similar_sibling_slug', Number(score.toFixed(2)), 'review_merge');
        }
      }
    }
  }

  // 5) Real overlap candidates we care about after Collective cleanup
  const focusPairs: Array<[string, string, string]> = [
    ['/clothing/mens/jackets', '/clothing/outerwear/jackets', 'mens_vs_outerwear_jackets'],
    ['/clothing/womens/riding-jackets', '/clothing/outerwear/jackets', 'womens_riding_vs_outerwear'],
    ['/clothing/tops', '/clothing/womens/tops', 'generic_tops_vs_womens_tops'],
    ['/clothing/footwear/boots', '/clothing/footwear/tall-boots', 'boots_vs_tall_boots'],
    ['/clothing/footwear/boots', '/clothing/footwear/riding-boots', 'boots_vs_riding_boots'],
    ['/clothing/footwear/tall-boots', '/clothing/footwear/riding-boots', 'tall_vs_riding_boots'],
    ['/clothing/mens/show-jackets', '/clothing/womens/riding-jackets', 'mens_show_vs_womens_riding'],
    ['/horse/bonnets', '/horse/bonnets/fly-masks', 'bonnets_vs_fly_masks'],
    ['/horse/rugs/therapeutic', '/horse/rugs', 'therapeutic_under_rugs'],
    ['/clothing/womens/jackets', '/clothing/womens/riding-jackets', 'draft_womens_jackets_overlap'],
  ];
  for (const [pa, pb, reason] of focusPairs) {
    const a = paths.find((p) => p.path === pa);
    const b = paths.find((p) => p.path === pb);
    if (!a || !b) continue;
    addPair(a, b, reason, 0.85, 'confirm_both_needed_or_merge');
  }

  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      a.path_a.localeCompare(b.path_a) ||
      a.path_b.localeCompare(b.path_b)
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = resolve(process.cwd(), 'exports');
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, `category-duplicate-audit-${stamp}.csv`);

  const headers = [
    'path_a',
    'path_b',
    'reason',
    'score',
    'leaf_a',
    'leaf_b',
    'rollup_a',
    'rollup_b',
    'h1_a',
    'h1_b',
    'suggested_keep',
    'suggested_action',
    'verdict',
    'notes',
  ];
  const lines = [headers.join(',')];
  for (const p of pairs) {
    lines.push(
      [
        p.path_a,
        p.path_b,
        p.reason,
        String(p.score),
        String(p.leaf_a),
        String(p.leaf_b),
        String(p.rollup_a),
        String(p.rollup_b),
        csvEscape(p.h1_a),
        csvEscape(p.h1_b),
        p.suggested_keep,
        p.suggested_action,
        '', // verdict: keep_both | merge_a_into_b | merge_b_into_a
        '',
      ].join(',')
    );
  }
  writeFileSync(out, `${lines.join('\n')}\n`);

  const byReason = new Map<string, number>();
  for (const p of pairs) byReason.set(p.reason, (byReason.get(p.reason) || 0) + 1);

  console.log(`Published paths scanned: ${paths.length}`);
  console.log(`Duplicate/overlap pairs: ${pairs.length}`);
  for (const [reason, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${n}`);
  }
  console.log(`\nWrote ${out}`);
  console.log('Fill verdict: keep_both | merge_a_into_b | merge_b_into_a');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
