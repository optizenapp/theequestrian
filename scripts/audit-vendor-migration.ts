#!/usr/bin/env tsx
/**
 * Audit vendor migration readiness: allocations, SEO overrides, handle suffixes, brand.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import {
  fetchMigrationProducts,
  getArg,
  loadHandlesFromFile,
} from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type AuditRow = {
  handle: string;
  product_id: string;
  title: string;
  available_for_sale: boolean;
  has_allocation: boolean;
  canonical_path: string | null;
  stale_allocation_id: boolean;
  has_seo_override: boolean;
  seo_metadata_complete: boolean;
  brand: string | null;
  brand_hub_handle: string | null;
  handle_suffix: string | null;
  bucket: string;
};

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const brand = getArg('--brand')?.trim();
  const handlesFile = getArg('--handles-file');
  if (!vendor) {
    console.error('Usage: npx tsx scripts/audit-vendor-migration.ts --vendor="Vendor Name" [--brand=Roeckl]');
    process.exit(1);
  }

  const handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;

  console.log(`Auditing vendor migration: ${vendor}`);
  if (brand) console.log(`  Brand filter: ${brand}`);
  if (handles?.length) console.log(`  Handles file: ${handles.length} handles`);
  console.log('');

  const rows = (await fetchMigrationProducts({ vendor, brand, handles })) as unknown as Array<{
    product_id: string;
    handle: string;
    title: string;
    available_for_sale: boolean;
    brand: string | null;
    brand_hub_handle: string | null;
    allocation_product_id: string | null;
    canonical_path: string | null;
    override_handle: string | null;
    use_headless_meta_title: boolean | null;
    use_headless_meta_description: boolean | null;
    use_headless_title: boolean | null;
    use_headless_bullets: boolean | null;
  }>;

  if (rows.length === 0) {
    console.log('No products found. Run scoped sync first (brand:migration:post-cutover or sync-scoped-products-to-db).');
    process.exit(1);
  }

  const suffixPattern = /-\d+$/;
  const auditRows: AuditRow[] = rows.map((row) => {
    const hasAllocation = Boolean(row.allocation_product_id);
    const staleAllocationId =
      hasAllocation && row.allocation_product_id !== row.product_id;
    const hasSeoOverride = Boolean(row.override_handle);
    const seoMetadataComplete =
      row.use_headless_meta_title === true &&
      row.use_headless_meta_description === true &&
      row.use_headless_title === true &&
      row.use_headless_bullets === true;
    const handleSuffix = suffixPattern.test(row.handle) ? row.handle.match(suffixPattern)?.[0] ?? null : null;

    let bucket = 'ok';
    if (handleSuffix) bucket = 'handle_suffix';
    else if (!hasAllocation) bucket = 'unallocated';
    else if (staleAllocationId) bucket = 'stale_product_id';
    else if (!hasSeoOverride || !seoMetadataComplete) bucket = 'needs_seo';

    return {
      handle: row.handle,
      product_id: row.product_id,
      title: row.title,
      available_for_sale: row.available_for_sale,
      has_allocation: hasAllocation,
      canonical_path: row.canonical_path,
      stale_allocation_id: staleAllocationId,
      has_seo_override: hasSeoOverride,
      seo_metadata_complete: seoMetadataComplete,
      brand: row.brand,
      brand_hub_handle: row.brand_hub_handle,
      handle_suffix: handleSuffix,
      bucket,
    };
  });

  const counts = auditRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] || 0) + 1;
    return acc;
  }, {});

  console.log('Summary:');
  for (const [bucket, count] of Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${bucket}: ${count}`);
  }
  console.log(`  total: ${auditRows.length}\n`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = [vendor, brand].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const exportPath = resolve(process.cwd(), 'exports', `vendor-migration-audit-${slug}-${ts}.csv`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(exportPath, stringify(auditRows, { header: true }));
  console.log(`Full report: ${exportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
