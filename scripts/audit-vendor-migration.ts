#!/usr/bin/env tsx
/**
 * Audit vendor migration readiness: allocations, SEO overrides, handle suffixes, brand,
 * and bullet-point content quality (E-A-V count, enrichment_log status).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import {
  fetchVendorBulletAuditRows,
  getArg,
  loadHandlesFromFile,
} from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

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
  bullet_count: number;
  eav_bullet_count: number;
  last_enrichment_applied: boolean | null;
  brand: string | null;
  brand_hub_handle: string | null;
  handle_suffix: string | null;
  migration_bucket: string;
  bullet_bucket: string;
  bucket: string;
};

function parseBulletPoints(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((b): b is string => typeof b === 'string' && b.trim().length > 0);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function countEavBullets(bullets: string[]): number {
  return bullets.filter((b) => b.includes(':')).length;
}

function resolveMigrationBucket(input: {
  handle: string;
  hasAllocation: boolean;
  staleAllocationId: boolean;
  hasSeoOverride: boolean;
  seoMetadataComplete: boolean;
}): string {
  const suffixPattern = /-\d+$/;
  if (suffixPattern.test(input.handle)) return 'handle_suffix';
  if (!input.hasAllocation) return 'unallocated';
  if (input.staleAllocationId) return 'stale_product_id';
  if (!input.hasSeoOverride || !input.seoMetadataComplete) return 'needs_seo';
  return 'ok';
}

function resolveBulletBucket(input: {
  hasSeoOverride: boolean;
  seoMetadataComplete: boolean;
  bulletCount: number;
  eavBulletCount: number;
  lastEnrichmentApplied: boolean | null;
}): string {
  if (!input.hasSeoOverride) return 'missing_override';
  if (!input.seoMetadataComplete) return 'flags_incomplete';
  if (input.bulletCount < 3) return 'bullets_empty';
  if (input.eavBulletCount < 3) return 'bullets_low_quality';
  if (input.lastEnrichmentApplied === false) return 'compliance_blocked';
  return 'ok';
}

function resolveCombinedBucket(migrationBucket: string, bulletBucket: string): string {
  if (migrationBucket !== 'ok') return migrationBucket;
  return bulletBucket;
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const brand = getArg('--brand')?.trim();
  const handlesFile = getArg('--handles-file');
  if (!vendor) {
    console.error(
      'Usage: npx tsx scripts/audit-vendor-migration.ts --vendor="Vendor Name" [--brand=QJ Riding Wear] [--floral-prod]'
    );
    process.exit(1);
  }

  const handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;

  console.log(`Auditing vendor migration: ${vendor}`);
  if (brand) console.log(`  Brand filter: ${brand}`);
  if (handles?.length) console.log(`  Handles file: ${handles.length} handles`);
  console.log('');

  const rows = (await fetchVendorBulletAuditRows({ vendor, brand, handles })) as unknown as Array<{
    product_id: string;
    handle: string;
    title: string;
    available_for_sale: boolean;
    brand: string | null;
    brand_hub_handle: string | null;
    allocation_product_id: string | null;
    canonical_path: string | null;
    override_handle: string | null;
    bullet_points: unknown;
    use_headless_meta_title: boolean | null;
    use_headless_meta_description: boolean | null;
    use_headless_title: boolean | null;
    use_headless_bullets: boolean | null;
    last_enrichment_applied: boolean | null;
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
    const bullets = parseBulletPoints(row.bullet_points);
    const bulletCount = bullets.length;
    const eavBulletCount = countEavBullets(bullets);
    const handleSuffix = suffixPattern.test(row.handle) ? row.handle.match(suffixPattern)?.[0] ?? null : null;

    const migrationBucket = resolveMigrationBucket({
      handle: row.handle,
      hasAllocation,
      staleAllocationId,
      hasSeoOverride,
      seoMetadataComplete,
    });
    const bulletBucket = resolveBulletBucket({
      hasSeoOverride,
      seoMetadataComplete,
      bulletCount,
      eavBulletCount,
      lastEnrichmentApplied: row.last_enrichment_applied,
    });
    const bucket = resolveCombinedBucket(migrationBucket, bulletBucket);

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
      bullet_count: bulletCount,
      eav_bullet_count: eavBulletCount,
      last_enrichment_applied: row.last_enrichment_applied,
      brand: row.brand,
      brand_hub_handle: row.brand_hub_handle,
      handle_suffix: handleSuffix,
      migration_bucket: migrationBucket,
      bullet_bucket: bulletBucket,
      bucket,
    };
  });

  const counts = auditRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] || 0) + 1;
    return acc;
  }, {});

  const bulletCounts = auditRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.bullet_bucket] = (acc[row.bullet_bucket] || 0) + 1;
    return acc;
  }, {});

  console.log('Combined summary:');
  for (const [bucket, count] of Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${bucket}: ${count}`);
  }
  console.log(`  total: ${auditRows.length}\n`);

  console.log('Bullet content summary:');
  for (const [bucket, count] of Object.entries(bulletCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${bucket}: ${count}`);
  }
  console.log('');

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = [vendor, brand].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const exportPath = resolve(process.cwd(), 'exports', `vendor-migration-audit-${slug}-${ts}.csv`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(exportPath, stringify(auditRows, { header: true }));
  console.log(`Full report: ${exportPath}`);

  const gapHandles = auditRows
    .filter((r) => r.bullet_bucket !== 'ok' || r.migration_bucket !== 'ok')
    .map((r) => r.handle);
  if (gapHandles.length > 0) {
    const gapPath = resolve(process.cwd(), 'exports', `vendor-migration-gaps-${slug}-${ts}.txt`);
    fs.writeFileSync(gapPath, gapHandles.join('\n') + '\n');
    console.log(`Gap handles (${gapHandles.length}): ${gapPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
