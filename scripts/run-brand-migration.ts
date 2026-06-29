#!/usr/bin/env tsx
/**
 * Roeckl / brand-scoped Collective migration runner (post-Shopify cutover).
 *
 * Shopify cutover (manual, per product or bulk):
 *   1. Delete/archive Webkul marketplace product (frees handle)
 *   2. Delete any Collective draft with -1 suffix
 *   3. Import from Collective → confirm original handle
 *   4. Activate
 *
 * Then run this script:
 *   npx tsx scripts/run-brand-migration.ts --vendor="Trailrace Equestrian Outfitters" --brand=Roeckl --phase=all
 *   npx tsx scripts/run-brand-migration.ts --vendor="..." --brand=Roeckl --phase=audit
 *   npx tsx scripts/run-brand-migration.ts --vendor="..." --brand=Roeckl --phase=post-cutover
 *
 * Phases:
 *   export     — Shopify + DB checklist CSV (pre or post cutover)
 *   audit      — migration readiness audit
 *   sync       — scoped Storefront sync (vendor/brand/handles only)
 *   repoint    — fix product_category_assignments.product_id by handle
 *   seo-shadow — metadata-only SEO preview (enrichment_log)
 *   seo-apply  — metadata-only SEO apply
 *   onboard    — assign brand + category URL for unallocated products in DB
 *   post-cutover — scoped sync → onboard → repoint → reset description overrides → audit
 *   all        — export → sync → onboard → repoint → audit (then print SEO commands)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
import {
  fetchMigrationProductsForExport,
  fetchMigrationProducts,
  getArg,
  hasFlag,
  loadHandlesFromFile,
  resetDescriptionOverrides,
  resetVendorPdpOverrides,
} from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

/** Production Neon (ep-floral-wind) — pass --floral-prod to target live DB. */
const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function prodDbEnv(): Record<string, string> {
  if (!hasFlag('--floral-prod')) return {};
  return { CUSTOM_DATABASE_URL: FLORAL_PROD_DATABASE_URL };
}

if (hasFlag('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

const VENDOR_DEFAULT = 'Trailrace Equestrian Outfitters';

type Phase =
  | 'export'
  | 'audit'
  | 'sync'
  | 'onboard'
  | 'repoint'
  | 'seo-shadow'
  | 'seo-apply'
  | 'cleanup'
  | 'reset-overrides'
  | 'post-cutover'
  | 'all';

const CATEGORY_DEFAULT = '/rider/gloves';

function runNpm(script: string, extraEnv: Record<string, string> = {}): void {
  const env = { ...process.env, ...extraEnv };
  console.log(`\n▶ ${script}\n`);
  execSync(`npm run ${script}`, { stdio: 'inherit', env, cwd: process.cwd() });
}

function runTsx(args: string, extraEnv: Record<string, string> = {}): void {
  const env = { ...process.env, ...prodDbEnv(), ...extraEnv };
  console.log(`\n▶ tsx ${args}\n`);
  execSync(`npx tsx ${args}`, { stdio: 'inherit', env, cwd: process.cwd() });
}

async function exportChecklist(vendor: string, brand: string, handlesFile?: string): Promise<string> {
  const handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;

  const dbRows = (await fetchMigrationProductsForExport({ vendor, brand, handles })) as unknown as Array<Record<string, unknown>>;

  let shopifyRows: Array<{ handle: string; id: string; status: string; title: string }> = [];
  try {
    const query = `
      query RoecklProducts($query: String!, $first: Int!, $after: String) {
        products(first: $first, after: $after, query: $query) {
          edges {
            node { id handle title status }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    let cursor: string | null = null;
    let hasNext = true;
    while (hasNext) {
      const data = await shopifyAdminFetch<{
        products: {
          edges: Array<{ node: { id: string; handle: string; title: string; status: string } }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>({
        query,
        variables: {
          query: `vendor:"${vendor}" title:*Roeckl*`,
          first: 100,
          after: cursor,
        },
        cache: 'no-store',
      });
      shopifyRows.push(...data.products.edges.map((e) => e.node));
      hasNext = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
    }
  } catch (error) {
    console.warn('[export] Shopify Admin fetch skipped:', error instanceof Error ? error.message : error);
  }

  const shopifyByHandle = new Map(shopifyRows.map((r) => [r.handle, r]));
  const merged = dbRows.map((row) => {
    const handle = String(row.handle);
    const shopify = shopifyByHandle.get(handle);
    return {
      handle,
      title: row.title,
      shopify_id: row.id,
      shopify_status: shopify?.status ?? '',
      shopify_admin_id: shopify?.id ?? '',
      vendor: row.vendor,
      brand: row.brand,
      available_for_sale: row.available_for_sale,
      canonical_path: row.canonical_path,
      stale_allocation_id: row.stale_allocation_id,
      handle_suffix: /-\d+$/.test(handle) ? handle.match(/-\d+$/)?.[0] : '',
      in_db: true,
      in_shopify_search: Boolean(shopify),
    };
  });

  for (const s of shopifyRows) {
    if (!merged.some((m) => m.handle === s.handle)) {
      merged.push({
        handle: s.handle,
        title: s.title,
        shopify_id: '',
        shopify_status: s.status,
        shopify_admin_id: s.id,
        vendor,
        brand,
        available_for_sale: s.status === 'ACTIVE',
        canonical_path: null,
        stale_allocation_id: false,
        handle_suffix: /-\d+$/.test(s.handle) ? s.handle.match(/-\d+$/)?.[0] : '',
        in_db: false,
        in_shopify_search: true,
      });
    }
  }

  merged.sort((a, b) => a.handle.localeCompare(b.handle));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const exportPath = resolve(process.cwd(), 'exports', `brand-migration-${slug}-${ts}.csv`);
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(exportPath, stringify(merged, { header: true }));

  console.log(`\nExport: ${exportPath}`);
  console.log(`  DB rows: ${dbRows.length}`);
  console.log(`  Shopify (title:*Roeckl*): ${shopifyRows.length}`);
  console.log(`  Merged: ${merged.length}`);
  console.log(`  Handle suffix (-1 etc): ${merged.filter((m) => m.handle_suffix).length}`);

  return exportPath;
}

async function auditBrand(vendor: string, brand: string, handlesFile?: string): Promise<void> {
  runTsx(
    `scripts/audit-vendor-migration.ts --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}"${handlesFile ? ` --handles-file="${handlesFile}"` : ''}`
  );
}

async function syncBrand(vendor: string, brand: string, handlesFile?: string): Promise<void> {
  runTsx(
    `scripts/sync-scoped-products-to-db.ts --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}"${handlesFile ? ` --handles-file="${handlesFile}"` : ''}`
  );
}

async function onboardBrand(
  vendor: string,
  brand: string,
  categoryPath: string,
  dryRun: boolean,
  handlesFile?: string
): Promise<void> {
  runTsx(
    `scripts/onboard-vendor-products.ts --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}" --category="${categoryPath.replace(/"/g, '\\"')}"${dryRun ? ' --dry-run' : ''}${handlesFile ? ` --handles-file="${handlesFile}"` : ''}`
  );
}

async function repointBrand(vendor: string, brand: string, dryRun: boolean, handlesFile?: string): Promise<void> {
  runTsx(
    `scripts/repoint-allocation-ids.ts --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}"${dryRun ? ' --dry-run' : ''}${handlesFile ? ` --handles-file="${handlesFile}"` : ''}`
  );
}

async function cleanupStaleBrand(vendor: string, brand: string, dryRun: boolean): Promise<void> {
  runTsx(
    `scripts/cleanup-stale-brand-products.ts --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}"${dryRun ? ' --dry-run' : ''}${hasFlag('--floral-prod') ? ' --floral-prod' : ''}`
  );
}

async function resetBrandDescriptionOverrides(
  vendor: string,
  brand: string,
  dryRun: boolean,
  handlesFile?: string
): Promise<void> {
  if (dryRun) {
    console.log('\n[dry-run] Skipping description override reset');
    return;
  }
  const handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;
  const rows = await resetVendorPdpOverrides({ vendor, brand, handles });
  console.log(
    `\nReset PDP overrides (title/description/bullets) for ${Array.isArray(rows) ? rows.length : 0} products — Collective/Shopify copy will show on PDP`
  );

  await revalidateProductionCaches(vendor, brand, handles, [`/brands/${slugFromBrandName(brand)}`]);
}

async function revalidateProductionCaches(
  vendor: string,
  brand: string,
  handles?: string[],
  extraPaths: string[] = []
): Promise<void> {
  const secret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  if (!secret) {
    console.warn('\n⚠ INTERNAL_REVALIDATE_SECRET not set — production cache not busted. Redeploy or hit revalidate API manually.');
    return;
  }

  const products = (await fetchMigrationProducts({ vendor, brand, handles })) as unknown as Array<{ handle: string }>;
  console.log(`\nBusting production cache for ${products.length} products...`);

  for (const path of extraPaths) {
    try {
      const response = await fetch(`${siteUrl}/api/internal/revalidate-shopify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ paths: [path] }),
      });
      if (!response.ok) {
        console.warn(`  ⚠ revalidate failed for path ${path}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`  ⚠ revalidate error for path ${path}:`, error instanceof Error ? error.message : error);
    }
  }

  for (const { handle } of products) {
    try {
      const response = await fetch(`${siteUrl}/api/internal/revalidate-shopify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ productHandle: handle }),
      });
      if (!response.ok) {
        console.warn(`  ⚠ revalidate failed for ${handle}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`  ⚠ revalidate error for ${handle}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log('Production cache revalidation requests sent.');
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim() || VENDOR_DEFAULT;
  const brand = getArg('--brand')?.trim() || 'Roeckl';
  const phase = (getArg('--phase') || 'all') as Phase;
  const handlesFile = getArg('--handles-file');
  const categoryPath = getArg('--category')?.trim() || CATEGORY_DEFAULT;
  const dryRun = hasFlag('--dry-run');

  console.log('Brand migration runner');
  console.log(`  Vendor: ${vendor}`);
  console.log(`  Brand: ${brand}`);
  console.log(`  Phase: ${phase}`);
  if (phase === 'onboard' || phase === 'post-cutover' || phase === 'all') {
    console.log(`  Default category: ${categoryPath}`);
  }
  if (handlesFile) console.log(`  Handles file: ${handlesFile}`);

  if (phase === 'export' || phase === 'all') {
    await exportChecklist(vendor, brand, handlesFile);
  }

  if (phase === 'sync' || phase === 'post-cutover' || phase === 'all') {
    if (!dryRun) await syncBrand(vendor, brand, handlesFile);
    else console.log('\n[dry-run] Skipping scoped sync');
  }

  if (phase === 'cleanup' || phase === 'post-cutover' || phase === 'all') {
    await cleanupStaleBrand(vendor, brand, dryRun);
  }

  if (phase === 'onboard' || phase === 'post-cutover' || phase === 'all') {
    await onboardBrand(vendor, brand, categoryPath, dryRun, handlesFile);
  }

  if (phase === 'repoint' || phase === 'post-cutover' || phase === 'all') {
    await repointBrand(vendor, brand, dryRun, handlesFile);
  }

  if (phase === 'post-cutover' || phase === 'reset-overrides' || phase === 'all') {
    await resetBrandDescriptionOverrides(vendor, brand, dryRun, handlesFile);
  }

  if (phase === 'audit' || phase === 'post-cutover' || phase === 'all') {
    await auditBrand(vendor, brand, handlesFile);
  }

  if (phase === 'seo-shadow') {
    runTsx(
      `scripts/run-seo-enrichment.ts --metadata-only --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}" --command=once`,
      { SEO_ENRICHMENT_MODE: 'shadow' }
    );
  }

  if (phase === 'seo-apply') {
    runTsx(
      `scripts/run-seo-enrichment.ts --metadata-only --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}" --command=select`,
      { SEO_ENRICHMENT_MODE: 'apply', SEO_ENRICHMENT_DAILY_BATCH_SIZE: '50' }
    );
    let remaining = 50;
    let rounds = 0;
    while (remaining > 0 && rounds < 20) {
      runTsx(
        `scripts/run-seo-enrichment.ts --metadata-only --vendor="${vendor.replace(/"/g, '\\"')}" --brand="${brand.replace(/"/g, '\\"')}" --command=process`,
        { SEO_ENRICHMENT_MODE: 'apply', SEO_ENRICHMENT_QUEUE_POLL_LIMIT: '25' }
      );
      rounds += 1;
      remaining -= 25;
    }
  }

  if (phase === 'all') {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Shopify cutover (manual) — do BEFORE post-cutover if not done:');
    console.log('  1. Archive/delete Webkul Roeckl products (frees handles)');
    console.log('  2. Import 29 Roeckl products from Collective');
    console.log('  3. Confirm handles have NO -1 suffix');
    console.log('  4. Activate products');
    console.log('\nThen run SEO:');
    console.log(`  npx tsx scripts/run-brand-migration.ts --vendor="${vendor}" --brand=${brand} --phase=seo-shadow`);
    console.log(`  npx tsx scripts/run-brand-migration.ts --vendor="${vendor}" --brand=${brand} --phase=seo-apply`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
