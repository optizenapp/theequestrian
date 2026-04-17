import { resolve } from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';
import { invalidateBrandContentCache } from '@/lib/content/brand-content';
import {
  groupRollupHandlesByParentBrand,
  parseParentRollupCsvRows,
  resolveParentBrandHubHandles,
  type BrandContentHubRow,
} from '@/lib/brands/resolve-parent-brand-hub';
import { upsertAllParentBrandContent } from '@/lib/brands/upsert-parent-brand-content';
import { applyMappedBrandRows, clearBrandRows } from '@/lib/brands/apply-parent-brand-updates';

type CsvRow = Record<string, string>;

export type RunParentBrandRollupOptions = {
  rollupPath: string;
  auditPath: string;
  dryRun: boolean;
};
export async function runParentBrandRollup(opts: RunParentBrandRollupOptions): Promise<void> {
  const { rollupPath, auditPath, dryRun } = opts;

  if (!dryRun) {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_hub_handle TEXT`;
  }

  const rollupRows = parse(fs.readFileSync(rollupPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
  const rollupMap = parseParentRollupCsvRows(rollupRows);

  const auditRows = parse(fs.readFileSync(auditPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const brandRows = (await sql`
    SELECT handle, title, breadcrumb_label FROM brand_content
  `) as unknown as BrandContentHubRow[];

  const byParent = groupRollupHandlesByParentBrand(rollupMap);
  const { parentToResolution, warnings } = resolveParentBrandHubHandles(byParent, brandRows);
  for (const w of warnings) console.warn('[rollup]', w);

  const nhToHub = new Map<string, string>();
  for (const [nh, parent] of rollupMap) {
    const res = parentToResolution.get(parent);
    if (res) nhToHub.set(nh, res.hubHandle);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = resolve(process.cwd(), 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const mapRows = [...parentToResolution.entries()].map(([parentBrand, r]) => ({ parent_brand: parentBrand, brand_hub_handle: r.hubHandle, resolution_source: r.source }));
  fs.writeFileSync(resolve(outDir, `parent-brand-resolve-map-${ts}.csv`), stringify(mapRows, { header: true }), 'utf-8');

  const exceptions: Record<string, string>[] = [];
  let updated = 0;
  let cleared = 0;
  let skipped = 0;
  const mappedRows: Array<{ handle: string; parentBrand: string; hubHandle: string }> = [];
  const mappedHandles = new Set<string>();
  const clearHandles = new Set<string>();

  // Primary source of truth: the rollup CSV. Each `normalized_handle` is treated
  // as the product handle to assign directly to its parent brand. This works for
  // both products that have an audit suggestion and those that don't.
  for (const [handle, parentBrand] of rollupMap) {
    const hub = nhToHub.get(handle);
    if (!hub) {
      exceptions.push({ handle, reason: 'no_hub_for_parent', suggested_brand_handle: handle, parent_brand: parentBrand });
      continue;
    }
    mappedRows.push({ handle, parentBrand, hubHandle: hub });
    mappedHandles.add(handle);
  }

  // Audit-driven fallback: a product's audit `suggested_brand_handle` may map to a
  // parent in the rollup even when the product handle itself isn't listed.
  for (const row of auditRows) {
    const handle = (row.handle || '').trim();
    const suggested = (row.suggested_brand_handle || row.suggestedBrandHandle || '').trim();
    if (!handle) {
      skipped++;
      continue;
    }
    if (mappedHandles.has(handle)) continue;
    if (!suggested) {
      exceptions.push({ handle, reason: 'empty_suggested_brand_handle', suggested_brand_handle: '' });
      clearHandles.add(handle);
      skipped++;
      continue;
    }
    const parentBrand = rollupMap.get(suggested);
    if (!parentBrand) {
      exceptions.push({ handle, reason: 'rollup_miss', suggested_brand_handle: suggested });
      clearHandles.add(handle);
      skipped++;
      continue;
    }
    const hub = nhToHub.get(suggested);
    if (!hub) {
      exceptions.push({ handle, reason: 'no_hub_for_parent', suggested_brand_handle: suggested, parent_brand: parentBrand });
      clearHandles.add(handle);
      skipped++;
      continue;
    }

    mappedRows.push({ handle, parentBrand, hubHandle: hub });
    mappedHandles.add(handle);
  }

  if (dryRun) {
    updated = mappedRows.length;
    cleared = clearHandles.size;
  } else {
    const matchedMapped = await applyMappedBrandRows(mappedRows);
    updated = matchedMapped.size;

    for (const row of mappedRows) {
      if (matchedMapped.has(row.handle)) continue;
      exceptions.push({ handle: row.handle, reason: 'product_not_in_db', parent_brand: row.parentBrand });
      skipped++;
    }

    const matchedCleared = await clearBrandRows([...clearHandles]);
    cleared = matchedCleared.size;
  }

  const hubStats = await upsertAllParentBrandContent(parentToResolution, dryRun);
  if (!dryRun) invalidateBrandContentCache();

  fs.writeFileSync(resolve(outDir, `parent-brand-rollup-exceptions-${ts}.csv`), stringify(exceptions, { header: true }), 'utf-8');

  console.log(
    dryRun
      ? `[dry-run] Would update ${updated} products and clear ${cleared}; rollup keys: ${rollupMap.size}; parents: ${parentToResolution.size}`
      : `Updated ${updated} products, cleared ${cleared}; skipped/problem rows: ${skipped}; brand_content inserts/updates/noops: ${hubStats.inserts}/${hubStats.updates}/${hubStats.noops}`
  );
  console.log(`Wrote mapping → exports/parent-brand-resolve-map-${ts}.csv`);
  console.log(`Wrote exceptions (${exceptions.length}) → exports/parent-brand-rollup-exceptions-${ts}.csv`);
}
