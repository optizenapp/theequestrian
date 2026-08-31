#!/usr/bin/env tsx
/**
 * Dry-run inventory: /accessories/gifts allocations → proposed leaf paths.
 *
 *   npx tsx scripts/plan-accessories-gift-split.ts
 *   npx tsx scripts/plan-accessories-gift-split.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { createSql } from './brand-page-pipeline/db';
import { hasFlag } from './lib/migration-cli';
import {
  isGiftsCategoryPath,
  proposedPathForProductType,
} from './lib/accessories-gift-split-map';

config({ path: resolve(process.cwd(), '.env.local') });

type Row = {
  product_id: string;
  handle: string;
  product_type: string | null;
  vendor: string | null;
  category_path: string;
  canonical_path: string;
};

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const sql = createSql(floralProd);

  const rows = (await sql`
    SELECT
      pca.product_id,
      p.handle,
      p.product_type,
      p.vendor,
      pca.category_path,
      pca.canonical_path
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE pca.category_path = '/accessories/gifts'
       OR pca.category_path LIKE '/accessories/gifts/%'
    ORDER BY p.handle
  `) as unknown as Row[];

  const plan = rows.map((r) => {
    const proposed = proposedPathForProductType(r.product_type);
    const onGifts = isGiftsCategoryPath(r.category_path);
    const action = proposed && onGifts ? 'MOVE' : 'KEEP';
    return {
      handle: r.handle,
      product_id: r.product_id,
      product_type: r.product_type || '',
      vendor: r.vendor || '',
      current_path: r.category_path,
      canonical_path: r.canonical_path,
      proposed_path: proposed || '',
      action,
    };
  });

  const move = plan.filter((p) => p.action === 'MOVE');
  const keep = plan.filter((p) => p.action === 'KEEP');

  const byLeaf = new Map<string, number>();
  for (const p of move) {
    byLeaf.set(p.proposed_path, (byLeaf.get(p.proposed_path) || 0) + 1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(process.cwd(), 'exports', `accessories-gift-split-plan-${ts}.csv`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(
    outPath,
    stringify(plan, {
      header: true,
      columns: [
        'handle',
        'product_id',
        'product_type',
        'vendor',
        'current_path',
        'canonical_path',
        'proposed_path',
        'action',
      ],
    })
  );

  console.log(`DB: ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`Gifts allocations: ${plan.length}`);
  console.log(`MOVE: ${move.length}`);
  console.log(`KEEP: ${keep.length}`);
  console.log('\nBy proposed leaf:');
  for (const [path, n] of [...byLeaf.entries()].sort((a, b) => b[1] - a[1])) {
    const flag = n < 5 ? '  [<5 thin]' : '';
    console.log(`  ${n.toString().padStart(4)}  ${path}${flag}`);
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
