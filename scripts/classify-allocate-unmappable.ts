#!/usr/bin/env tsx
/**
 * AI-classify and allocate products that lack collection_mapping matches.
 *
 * Usage:
 *   npx tsx scripts/classify-allocate-unmappable.ts --floral-prod --handles-file=exports/unmappable-allocations-....csv
 *   npx tsx scripts/classify-allocate-unmappable.ts --floral-prod --vendor="Trailrace Equestrian Outfitters"
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { getProductByHandle } from '@/lib/shopify/products';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import { ProductClassifier } from '@/lib/ai/product-classifier';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import { getArg, hasFlag, loadHandlesFromFile } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

function vendorPrimaryLike(vendor: string): string {
  const token = vendor.trim().split(/\s+/)[0]?.toLowerCase();
  return token ? `${token}%` : `${vendor.trim().toLowerCase()}%`;
}

function loadValidProductTypes(): string[] {
  const mappingPath = resolve(process.cwd(), 'exports', 'mapping-template-draft2.csv');
  const records = parse(fs.readFileSync(mappingPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<{ action?: string; product_type?: string }>;
  const types = new Set<string>();
  for (const row of records) {
    if (row.action !== 'exclude' && row.product_type?.trim()) types.add(row.product_type.trim());
  }
  return [...types].sort();
}

async function fetchUnallocatedHandles(vendor: string): Promise<string[]> {
  const rows = await sql`
    SELECT p.handle
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE pca.product_id IS NULL
      AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    ORDER BY p.handle
  `;
  return (Array.isArray(rows) ? rows : []).map((r: { handle: string }) => r.handle);
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  const handlesFile = getArg('--handles-file');
  const dryRun = hasFlag('--dry-run');
  const limitArg = getArg('--limit');
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;

  let handles = handlesFile ? loadHandlesFromFile(handlesFile) : undefined;
  if (!handles && vendor) handles = await fetchUnallocatedHandles(vendor);
  if (!handles?.length) {
    console.error('Provide --handles-file or --vendor with unallocated products');
    process.exit(1);
  }
  if (limit) handles = handles.slice(0, limit);

  console.log('Classify + allocate unmappable products');
  console.log(`  Handles: ${handles.length}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const validProductTypes = loadValidProductTypes();
  const validTypeMap = new Map(validProductTypes.map((t) => [t.toLowerCase(), t]));
  const brands = await getAllPublishedBrandContent();
  const classifier = new ProductClassifier(validProductTypes, {
    model: 'gpt-4o',
    brands: brands.map((b) => ({ handle: b.handle, title: b.title })),
  });

  const batchSize = 25;
  let allocated = 0;
  let failed = 0;
  const failures: Array<{ handle: string; reason: string }> = [];

  for (let i = 0; i < handles.length; i += batchSize) {
    const batchHandles = handles.slice(i, i + batchSize);
    const products = [];
    for (const handle of batchHandles) {
      const product = await getProductByHandle(handle);
      if (product) products.push(product);
      else failures.push({ handle, reason: 'not found in Shopify' });
    }

    if (products.length === 0) continue;

    const results = await classifier.classifyBatch(
      products.map((p) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        vendor: p.vendor,
        tags: p.tags,
        collections: p.collections?.edges?.map((e) => e.node.handle) || [],
        currentType: p.productType,
        description: p.description || '',
        descriptionHtml: p.descriptionHtml || '',
        productUrl: p.onlineStoreUrl || '',
        canonicalCollection: p.metafield?.value || '',
        seoTitle: p.seo?.title || '',
        seoDescription: p.seo?.description || '',
        variantTitles: p.variants.edges.map((e) => e.node.title).filter(Boolean).slice(0, 10),
        variantOptions: p.variants.edges
          .flatMap((e) => e.node.selectedOptions || [])
          .map((opt) => `${opt.name}: ${opt.value}`)
          .slice(0, 20),
        imageUrls: p.images.edges.map((e) => e.node.url).filter(Boolean).slice(0, 5),
        imageAltTexts: p.images.edges.map((e) => e.node.altText || '').filter(Boolean).slice(0, 5),
      }))
    );

    for (const product of products) {
      const result = results.get(product.id);
      if (!result) {
        failures.push({ handle: product.handle, reason: 'no classification result' });
        failed += 1;
        continue;
      }

      const suggestedRaw = (result.suggestedType || '').trim();
      const suggested = validTypeMap.get(suggestedRaw.toLowerCase());
      if (!suggested) {
        failures.push({ handle: product.handle, reason: `invalid type: ${result.suggestedType}` });
        failed += 1;
        continue;
      }

      const breadcrumbs = await getBreadcrumbsForProduct(suggested);
      const categoryPath = breadcrumbs[0]?.[breadcrumbs[0].length - 1]?.href;
      if (!categoryPath) {
        failures.push({ handle: product.handle, reason: `no category for type: ${suggested}` });
        failed += 1;
        continue;
      }

      if (dryRun) {
        console.log(`  [dry-run] ${product.handle} → ${categoryPath} (${suggested})`);
        allocated += 1;
        continue;
      }

      await upsertProductAllocation({
        productId: product.id,
        productHandle: product.handle,
        categoryPath,
      });
      allocated += 1;
    }

    console.log(`  … ${Math.min(i + batchSize, handles.length)}/${handles.length} processed`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Allocated: ${allocated}`);
  console.log(`Failed:    ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failures.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = resolve(process.cwd(), 'exports', `classify-allocate-failures-${ts}.csv`);
    fs.writeFileSync(exportPath, stringify(failures, { header: true }));
    console.log(`Failures export: ${exportPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
