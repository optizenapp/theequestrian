#!/usr/bin/env tsx
/**
 * Reallocate accessories products whose product_type maps to a split leaf
 * but are still on a parent or sibling path (e.g. books hub, gifts residual).
 *
 *   npx tsx scripts/reallocate-accessories-split-by-type.ts --floral-prod
 *   npx tsx scripts/reallocate-accessories-split-by-type.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { createSql } from './brand-page-pipeline/db';
import { hasFlag } from './lib/migration-cli';
import { proposedPathForProductType, splitPathParts } from './lib/accessories-gift-split-map';

config({ path: resolve(process.cwd(), '.env.local') });

type AllocRow = {
  product_id: string;
  handle: string;
  product_type: string | null;
  category_path: string;
  canonical_path: string;
};

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const sql = createSql(floralProd);

  console.log('Reallocate accessories split by product_type');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}\n`);

  const rows = (await sql`
    SELECT
      pca.product_id,
      p.handle,
      p.product_type,
      pca.category_path,
      pca.canonical_path
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE pca.category_path LIKE '/accessories%'
    ORDER BY p.handle
  `) as unknown as AllocRow[];

  const moves: Array<AllocRow & { proposed_path: string; new_canonical: string }> = [];
  for (const row of rows) {
    const proposed = proposedPathForProductType(row.product_type);
    if (!proposed) continue;
    const newCanonical = normalizePath(`${proposed}/${row.handle}`);
    if (row.category_path === proposed && row.canonical_path === newCanonical) continue;
    moves.push({ ...row, proposed_path: proposed, new_canonical: newCanonical });
  }

  console.log(`Accessories allocations: ${rows.length}`);
  console.log(`To move: ${moves.length}`);

  const byPath = new Map<string, number>();
  for (const m of moves) {
    byPath.set(m.proposed_path, (byPath.get(m.proposed_path) || 0) + 1);
  }
  for (const [path, n] of [...byPath.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  → ${path}`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = resolve(
    process.cwd(),
    'exports',
    `accessories-split-by-type-${dryRun ? 'dry' : 'apply'}-${ts}.csv`
  );
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(
    logPath,
    stringify(
      moves.map((m) => ({
        handle: m.handle,
        product_id: m.product_id,
        product_type: m.product_type || '',
        old_path: m.category_path,
        old_canonical: m.canonical_path,
        new_path: m.proposed_path,
        new_canonical: m.new_canonical,
      })),
      {
        header: true,
        columns: [
          'handle',
          'product_id',
          'product_type',
          'old_path',
          'old_canonical',
          'new_path',
          'new_canonical',
        ],
      }
    )
  );
  console.log(`\nLog: ${logPath}`);

  if (dryRun) {
    console.log('\nDry run — pass --apply to write allocations + 301s.');
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
  let redirects = 0;

  for (const m of moves) {
    const { topLevel, parentCategory, subcategoryHandle } = splitPathParts(m.proposed_path);
    await sql`
      UPDATE product_category_assignments
      SET canonical_path = ${m.new_canonical},
          category_path = ${m.proposed_path},
          top_level = ${topLevel},
          parent_category = ${parentCategory || null},
          subcategory_handle = ${subcategoryHandle || null},
          updated_at = NOW()
      WHERE product_id = ${m.product_id}
    `;
    moved += 1;

    if (m.canonical_path !== m.new_canonical) {
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (
          ${m.canonical_path},
          ${m.new_canonical},
          '301',
          'accessories-split-by-type',
          'active',
          NOW()
        )
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'accessories-split-by-type',
            status = 'active',
            updated_at = NOW()
      `;
      redirects += 1;
    }
  }

  console.log(`\nMoved ${moved} allocations; redirects ${redirects}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
