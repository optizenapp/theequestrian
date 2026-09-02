#!/usr/bin/env tsx
/**
 * Exclusively Equine brand reallocation review.
 * Treats EE as a marketplace aggregator (ignores vendor-as-brand), proposes
 * real brands from title/tags, and writes CSVs for review.
 *
 * Does NOT create brand pages or apply unless --apply-product-brands is passed.
 *
 * Usage:
 *   npx tsx scripts/propose-exclusively-equine-brands.ts --floral-prod
 *   npx tsx scripts/propose-exclusively-equine-brands.ts --floral-prod --apply-product-brands
 *   npx tsx scripts/propose-exclusively-equine-brands.ts --floral-prod --clear-vendor-brand
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import {
  buildBrandDisplayLexicon,
  findHubForBrandLabel,
  resolveProductBrandDisplay,
  type BrandLexiconEntry,
} from '@/lib/brands/resolve-product-brand-display';
import { inferProductBrand } from '@/lib/brands/infer-product-brand';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
import { hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const VENDOR = 'Exclusively Equine';
const HOUSE_BRAND_HUB = 'exclusively-equine';
const HOUSE_BRAND_LABEL = 'Exclusively Equine';

type Row = {
  handle: string;
  title: string | null;
  vendor: string | null;
  brand: string | null;
  brand_hub_handle: string | null;
  tags: string[] | null;
  description: string | null;
};

function looksLikeBrandName(name: string): boolean {
  const t = name.trim();
  if (t.length < 3 || t.length > 40) return false;
  if (/^\d/.test(t)) return false;
  // Reject obvious product descriptors
  if (
    /\b(hat|scarf|mug|card|bowl|bracelet|necklace|earring|sock|towel|cushion|tray|hook|bag|purse|shirt|vest|book|calendar|fountain|doona|glasses|ribbon|band|set|pack)\b/i.test(
      t
    )
  ) {
    return false;
  }
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;
  // Prefer proper-name style (at least one capitalised word with letters)
  return /[A-Za-z]{3,}/.test(t);
}

function proposeBrand(
  row: Row,
  lexicon: BrandLexiconEntry[],
  existingHubs: Set<string>
): {
  proposedBrand: string | null;
  proposedHub: string | null;
  source: string;
  action: 'keep_existing' | 'map_existing_hub' | 'create_new_brand_page' | 'unbranded';
} {
  const currentBrand = row.brand?.trim() || null;
  const currentHub = row.brand_hub_handle?.trim() || null;
  const isHouseBrand =
    (currentHub || '').toLowerCase() === HOUSE_BRAND_HUB &&
    (currentBrand || '').toLowerCase() === HOUSE_BRAND_LABEL.toLowerCase();

  if (isHouseBrand) {
    return {
      proposedBrand: currentBrand,
      proposedHub: currentHub,
      source: 'house_brand',
      action: 'keep_existing',
    };
  }

  if (currentBrand && currentHub) {
    return {
      proposedBrand: currentBrand,
      proposedHub: currentHub,
      source: 'existing_allocation',
      action: 'keep_existing',
    };
  }

  // Marketplace path: title → published brand lexicon only
  const resolved = resolveProductBrandDisplay(
    {
      brand: null,
      brandHubHandle: null,
      vendor: 'Trailrace',
      title: row.title,
      tags: Array.isArray(row.tags) ? row.tags : [],
    },
    lexicon
  );

  if (resolved.brand && resolved.brandHubHandle && existingHubs.has(resolved.brandHubHandle)) {
    return {
      proposedBrand: resolved.brand,
      proposedHub: resolved.brandHubHandle,
      source: 'title_lexicon',
      action: 'map_existing_hub',
    };
  }

  // Explicit gift-label brands that need new pages (not in published lexicon yet)
  const titleLower = (row.title || '').toLowerCase();
  const EXTRA_NEW_BRANDS: Array<{ match: string; brand: string; hub: string }> = [
    { match: 'emily cole', brand: 'Emily Cole', hub: 'emily-cole' },
  ];
  for (const extra of EXTRA_NEW_BRANDS) {
    if (titleLower.includes(extra.match)) {
      const hubExists = existingHubs.has(extra.hub);
      return {
        proposedBrand: extra.brand,
        proposedHub: extra.hub,
        source: 'extra_brand_list',
        action: hubExists ? 'map_existing_hub' : 'create_new_brand_page',
      };
    }
  }

  const inferred = inferProductBrand({
    handle: row.handle,
    title: row.title || '',
    descriptionHtml: row.description || '',
    vendor: null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    titleOverride: null,
    metaTitle: null,
    metaDescription: null,
    overrideDescriptionHtml: null,
    lexicon: lexicon.map((e) => e.label),
  });

  const brand = inferred.inferredBrand?.trim() || '';
  if (!brand || brand.toLowerCase() === 'exclusively equine') {
    return { proposedBrand: null, proposedHub: null, source: 'none', action: 'unbranded' };
  }

  const hub = findHubForBrandLabel(brand, lexicon) || slugFromBrandName(brand);
  if (existingHubs.has(hub)) {
    return {
      proposedBrand: brand,
      proposedHub: hub,
      source: `infer:${inferred.evidenceSources}:${inferred.confidence.toFixed(2)}`,
      action: 'map_existing_hub',
    };
  }

  // Candidate for NEW brand page only if tag-based or strong lexicon, and name looks like a brand
  const sources = (inferred.evidenceSources || '').toLowerCase();
  const fromTag = sources.includes('tag');
  const fromLexicon = sources.includes('lexicon') && inferred.confidence >= 0.62;
  if ((fromTag || fromLexicon) && looksLikeBrandName(brand)) {
    return {
      proposedBrand: brand,
      proposedHub: hub,
      source: `infer:${inferred.evidenceSources}:${inferred.confidence.toFixed(2)}`,
      action: 'create_new_brand_page',
    };
  }

  return { proposedBrand: null, proposedHub: null, source: 'none', action: 'unbranded' };
}

async function main(): Promise<void> {
  if (hasFlag('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database (ep-floral-wind)\n');
  }

  const applyProductBrands = hasFlag('--apply-product-brands');

  await ensureProductsBrandColumns();
  const published = await getAllPublishedBrandContent();
  const lexicon = buildBrandDisplayLexicon(published);
  const existingHubs = new Set(published.map((b) => b.handle));

  const rows = (await sql`
    SELECT handle, title, vendor, brand, brand_hub_handle, tags, description
    FROM products
    WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${VENDOR}))
    ORDER BY handle
  `) as unknown as Row[];

  console.log(`EE products: ${rows.length}`);

  const productRows: Record<string, string>[] = [];
  const brandAgg = new Map<
    string,
    { brand: string; hub: string; count: number; action: string; hubExists: boolean; sampleHandles: string[] }
  >();

  for (const row of rows) {
    const proposal = proposeBrand(row, lexicon, existingHubs);
    productRows.push({
      handle: row.handle,
      title: row.title || '',
      current_brand: row.brand || '',
      current_hub: row.brand_hub_handle || '',
      proposed_brand: proposal.proposedBrand || '',
      proposed_hub: proposal.proposedHub || '',
      source: proposal.source,
      action: proposal.action,
      hub_page_exists: proposal.proposedHub && existingHubs.has(proposal.proposedHub) ? 'yes' : 'no',
    });
  }

  // (cluster upgrade removed — gift titles are not brands)

  for (const r of productRows) {
    if (!r.proposed_brand || !r.proposed_hub) continue;
    const key = r.proposed_hub;
    const agg = brandAgg.get(key) || {
      brand: r.proposed_brand,
      hub: r.proposed_hub,
      count: 0,
      action: r.action === 'keep_existing' ? 'existing_hub' : r.action,
      hubExists: existingHubs.has(r.proposed_hub),
      sampleHandles: [],
    };
    agg.count += 1;
    if (agg.sampleHandles.length < 5) agg.sampleHandles.push(r.handle);
    if (r.action === 'create_new_brand_page') agg.action = 'create_new_brand_page';
    brandAgg.set(key, agg);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });

  const productsPath = resolve(process.cwd(), `exports/ee-brand-proposals-${stamp}.csv`);
  writeFileSync(productsPath, stringify(productRows, { header: true }));
  console.log(`Wrote ${productsPath} (${productRows.length} rows)`);

  const brandRows = [...brandAgg.values()]
    .sort((a, b) => b.count - a.count)
    .map((b) => ({
      brand: b.brand,
      hub_handle: b.hub,
      product_count: String(b.count),
      hub_page_exists: b.hubExists ? 'yes' : 'no',
      action: b.hubExists ? 'use_existing_brand_page' : 'create_new_brand_page',
      sample_handles: b.sampleHandles.join('|'),
      brand_page_url: `https://www.theequestrian.com.au/brands/${b.hub}`,
    }));

  const brandsPath = resolve(process.cwd(), `exports/ee-brand-pages-review-${stamp}.csv`);
  writeFileSync(brandsPath, stringify(brandRows, { header: true }));
  console.log(`Wrote ${brandsPath} (${brandRows.length} brands)`);

  const actionCounts = new Map<string, number>();
  for (const r of productRows) {
    actionCounts.set(r.action, (actionCounts.get(r.action) || 0) + 1);
  }
  console.log('\nProduct actions:');
  for (const [k, v] of [...actionCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}\t${k}`);
  }

  const newPages = brandRows.filter((b) => b.action === 'create_new_brand_page');
  console.log(`\nNew brand pages proposed: ${newPages.length}`);
  for (const b of newPages.slice(0, 30)) {
    console.log(`  ${b.product_count}\t${b.brand}\t${b.hub_handle}`);
  }

  // House-brand assignments (exclusively-equine hub) are managed by allocate-exclusively-equine-house-brand.ts — do not clear here.

  if (applyProductBrands) {
    let applied = 0;
    for (const r of productRows) {
      if (r.action !== 'map_existing_hub' && r.action !== 'keep_existing') continue;
      if (!r.proposed_brand || !r.proposed_hub) continue;
      if (r.action === 'keep_existing') continue;
      await sql`
        UPDATE products
        SET brand = ${r.proposed_brand},
            brand_hub_handle = ${r.proposed_hub},
            updated_at = NOW()
        WHERE handle = ${r.handle}
          AND LOWER(TRIM(vendor)) = LOWER(TRIM(${VENDOR}))
      `;
      applied += 1;
    }
    console.log(`Applied map_existing_hub brands: ${applied}`);
    console.log('New brand pages NOT created — review CSV first, then run brand-page pipeline.');
  } else {
    console.log('\nDry review only. To clear EE brand + apply existing-hub maps:');
    console.log('  npx tsx scripts/propose-exclusively-equine-brands.ts --floral-prod --apply-product-brands');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
