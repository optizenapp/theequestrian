#!/usr/bin/env tsx
/**
 * Apply parent brand rollup CSV + audit products CSV → products.brand, products.brand_hub_handle,
 * merge brand_content BRAND rules, emit mapping + exception CSVs.
 *
 * Usage:
 *   npx tsx scripts/apply-parent-brand-rollup.ts --rollup exports/parent-rollup.csv --audit exports/brand-audit-products-*.csv
 *   npx tsx scripts/apply-parent-brand-rollup.ts --rollup exports/rollup.csv --audit exports/audit.csv --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { runParentBrandRollup } from '@/lib/brands/run-parent-brand-rollup';
import { isBlockedBrandName } from '@/lib/brands/blocked-brands';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function parseArgs(argv: string[]): { rollup: string; audit: string; dryRun: boolean } {
  let rollup = '';
  let audit = '';
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--rollup' && argv[i + 1]) rollup = argv[++i];
    else if (a === '--audit' && argv[i + 1]) audit = argv[++i];
  }
  return { rollup, audit, dryRun };
}

async function main(): Promise<void> {
  const { rollup: rollupPath, audit: auditPath, dryRun } = parseArgs(process.argv);
  if (!rollupPath || !fs.existsSync(rollupPath)) {
    console.error('Usage: --rollup <parent-rollup.csv> --audit <brand-audit-products.csv> [--dry-run]');
    process.exit(1);
  }
  if (!auditPath || !fs.existsSync(auditPath)) {
    console.error('Missing --audit path to brand-audit-products CSV.');
    process.exit(1);
  }

  const rollupRows = parse(fs.readFileSync(rollupPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;
  const blockedParents = new Set<string>();
  for (const row of rollupRows) {
    const parent = (row.parent_brand || row.parentBrand || '').trim();
    if (isBlockedBrandName(parent)) blockedParents.add(parent);
  }
  if (blockedParents.size > 0) {
    console.warn(
      `[rollup] Blocked parent brands present in CSV and will be skipped: ${[...blockedParents]
        .sort((a, b) => a.localeCompare(b))
        .join(', ')}`
    );
  }

  await runParentBrandRollup({ rollupPath, auditPath, dryRun });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
