#!/usr/bin/env tsx
/**
 * Brand reallocation proposals for all current Collective vendors.
 * Writes product + brand-page review CSVs (no apply by default).
 *
 * Usage:
 *   npx tsx scripts/propose-collective-vendor-brands.ts --floral-prod
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
import { isMarketplaceAggregatorVendor } from '@/lib/brands/marketplace-vendors';
import { hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

/** Current Collective sellers (Shopify admin). */
const COLLECTIVE_VENDORS = [
  'Toptac International',
  'JnK Collective',
  'Exclusively Equine',
  'Little Equine Co.',
  'CAN Animal Care',
  'Plum Tack',
  'QJ Riding Wear',
  'Trailrace',
];

/** Vendors that intentionally use vendor-as-brand (house brand). */
const HOUSE_BRAND_VENDORS = new Set(
  ['JnK Collective', 'QJ Riding Wear', 'JNK Collective'].map((v) => v.toLowerCase())
);

/** Extra title→brand seeds for gift/collective catalogues. */
const EXTRA_NEW_BRANDS: Array<{ match: string; brand: string; hub: string }> = [
  { match: 'emily cole', brand: 'Emily Cole', hub: 'emily-cole' },
];

type Row = {
  handle: string;
  title: string | null;
  vendor: string | null;
  brand: string | null;
  brand_hub_handle: string | null;
  tags: string[] | null;
  description: string | null;
};

function vendorKey(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function vendorSlug(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isHouseBrandVendor(vendor: string | null): boolean {
  return HOUSE_BRAND_VENDORS.has((vendor || '').trim().toLowerCase());
}

function isVendorAsBrand(row: Row): boolean {
  const vendor = (row.vendor || '').trim();
  if (!vendor) return false;
  const brand = (row.brand || '').trim().toLowerCase();
  const hub = (row.brand_hub_handle || '').trim().toLowerCase();
  if (!brand && !hub) return false;
  return brand === vendor.toLowerCase() || hub === vendorSlug(vendor);
}

function looksLikeBrandName(name: string): boolean {
  const t = name.trim();
  if (t.length < 3 || t.length > 40) return false;
  if (/^\d/.test(t)) return false;
  if (
    /\b(hat|scarf|mug|card|bowl|bracelet|necklace|earring|sock|towel|cushion|tray|hook|bag|purse|shirt|vest|book|calendar|fountain|doona|glasses|ribbon|band|set|pack|boot|bridle|halter|pad|rug|whip)\b/i.test(
      t
    )
  ) {
    return false;
  }
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;
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
  action: string;
  notes: string;
} {
  const vendor = row.vendor?.trim() || '';
  const currentBrand = row.brand?.trim() || null;
  const currentHub = row.brand_hub_handle?.trim() || null;
  const house = isHouseBrandVendor(vendor);
  const vendorBrand = isVendorAsBrand(row);

  // House brands (JnK, QJ): keep vendor-as-brand when already set
  if (house) {
    if (currentBrand && currentHub) {
      return {
        proposedBrand: currentBrand,
        proposedHub: currentHub,
        source: 'house_brand',
        action: 'keep_house_brand',
        notes: 'Intentional vendor-as-brand',
      };
    }
    const hub = findHubForBrandLabel(vendor, lexicon) || vendorSlug(vendor);
    return {
      proposedBrand: vendor,
      proposedHub: hub,
      source: 'house_brand_default',
      action: existingHubs.has(hub) ? 'keep_house_brand' : 'create_house_brand_page',
      notes: 'House brand Collective vendor',
    };
  }

  // Already on a real (non-vendor) hub
  if (currentBrand && currentHub && !vendorBrand) {
    return {
      proposedBrand: currentBrand,
      proposedHub: currentHub,
      source: 'existing_allocation',
      action: 'keep_existing',
      notes: '',
    };
  }

  // Extra explicit brands
  const titleLower = (row.title || '').toLowerCase();
  for (const extra of EXTRA_NEW_BRANDS) {
    if (titleLower.includes(extra.match)) {
      return {
        proposedBrand: extra.brand,
        proposedHub: extra.hub,
        source: 'extra_brand_list',
        action: existingHubs.has(extra.hub) ? 'map_existing_hub' : 'create_new_brand_page',
        notes: '',
      };
    }
  }

  // Marketplace-style resolve (force aggregator path)
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
      notes: vendorBrand ? 'replace_vendor_as_brand' : '',
    };
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
  if (brand && brand.toLowerCase() !== vendor.toLowerCase()) {
    const hub = findHubForBrandLabel(brand, lexicon) || slugFromBrandName(brand);
    if (existingHubs.has(hub)) {
      return {
        proposedBrand: brand,
        proposedHub: hub,
        source: `infer:${inferred.evidenceSources}:${inferred.confidence.toFixed(2)}`,
        action: 'map_existing_hub',
        notes: vendorBrand ? 'replace_vendor_as_brand' : '',
      };
    }
    const sources = (inferred.evidenceSources || '').toLowerCase();
    const fromTag = sources.includes('tag');
    const fromLexicon = sources.includes('lexicon') && inferred.confidence >= 0.62;
    if ((fromTag || fromLexicon) && looksLikeBrandName(brand)) {
      return {
        proposedBrand: brand,
        proposedHub: hub,
        source: `infer:${inferred.evidenceSources}:${inferred.confidence.toFixed(2)}`,
        action: 'create_new_brand_page',
        notes: vendorBrand ? 'replace_vendor_as_brand' : '',
      };
    }
  }

  if (vendorBrand) {
    return {
      proposedBrand: null,
      proposedHub: null,
      source: 'clear_vendor_as_brand',
      action: 'unbranded',
      notes: 'Vendor is not a sellable brand — clear hub link',
    };
  }

  return {
    proposedBrand: null,
    proposedHub: null,
    source: 'none',
    action: 'unbranded',
    notes: '',
  };
}

async function main(): Promise<void> {
  if (hasFlag('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database (ep-floral-wind)\n');
  }

  await ensureProductsBrandColumns();
  const published = await getAllPublishedBrandContent();
  const lexicon = buildBrandDisplayLexicon(published);
  const existingHubs = new Set(published.map((b) => b.handle));

  const productRows: Record<string, string>[] = [];
  const brandAgg = new Map<
    string,
    {
      brand: string;
      hub: string;
      count: number;
      action: string;
      hubExists: boolean;
      vendors: Set<string>;
      sampleHandles: string[];
    }
  >();

  for (const vendor of COLLECTIVE_VENDORS) {
    const rows = (await sql`
      SELECT handle, title, vendor, brand, brand_hub_handle, tags, description
      FROM products
      WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${vendor}))
      ORDER BY handle
    `) as unknown as Row[];

    console.log(`${vendor}: ${rows.length} products (marketplace=${isMarketplaceAggregatorVendor(vendor)})`);

    for (const row of rows) {
      const proposal = proposeBrand(row, lexicon, existingHubs);
      productRows.push({
        vendor: row.vendor || vendor,
        handle: row.handle,
        title: row.title || '',
        current_brand: row.brand || '',
        current_hub: row.brand_hub_handle || '',
        proposed_brand: proposal.proposedBrand || '',
        proposed_hub: proposal.proposedHub || '',
        source: proposal.source,
        action: proposal.action,
        hub_page_exists:
          proposal.proposedHub && existingHubs.has(proposal.proposedHub) ? 'yes' : 'no',
        notes: proposal.notes,
        vendor_is_marketplace: isMarketplaceAggregatorVendor(row.vendor) ? 'yes' : 'no',
        vendor_is_house_brand: isHouseBrandVendor(row.vendor) ? 'yes' : 'no',
      });

      if (proposal.proposedBrand && proposal.proposedHub) {
        const key = proposal.proposedHub;
        const agg = brandAgg.get(key) || {
          brand: proposal.proposedBrand,
          hub: proposal.proposedHub,
          count: 0,
          action:
            proposal.action === 'keep_existing' || proposal.action === 'keep_house_brand'
              ? 'use_existing_or_house'
              : proposal.action,
          hubExists: existingHubs.has(proposal.proposedHub),
          vendors: new Set<string>(),
          sampleHandles: [],
        };
        agg.count += 1;
        agg.vendors.add(vendor);
        if (agg.sampleHandles.length < 5) agg.sampleHandles.push(row.handle);
        if (
          proposal.action === 'create_new_brand_page' ||
          proposal.action === 'create_house_brand_page'
        ) {
          agg.action = proposal.action;
        }
        brandAgg.set(key, agg);
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });

  const productsPath = resolve(process.cwd(), `exports/collective-brand-proposals-${stamp}.csv`);
  writeFileSync(productsPath, stringify(productRows, { header: true }));

  const brandRows = [...brandAgg.values()]
    .sort((a, b) => b.count - a.count)
    .map((b) => ({
      brand: b.brand,
      hub_handle: b.hub,
      product_count: String(b.count),
      vendors: [...b.vendors].sort().join('|'),
      hub_page_exists: b.hubExists ? 'yes' : 'no',
      action: b.hubExists
        ? b.action.includes('house')
          ? 'keep_house_brand_page'
          : 'use_existing_brand_page'
        : b.action,
      sample_handles: b.sampleHandles.join('|'),
      brand_page_url: `https://www.theequestrian.com.au/brands/${b.hub}`,
    }));

  const brandsPath = resolve(process.cwd(), `exports/collective-brand-pages-review-${stamp}.csv`);
  writeFileSync(brandsPath, stringify(brandRows, { header: true }));

  // Summary by vendor × action
  const summary = new Map<string, number>();
  for (const r of productRows) {
    const key = `${r.vendor}\t${r.action}`;
    summary.set(key, (summary.get(key) || 0) + 1);
  }
  console.log('\nBy vendor × action:');
  for (const [k, v] of [...summary.entries()].sort()) console.log(`  ${v}\t${k}`);

  const newPages = brandRows.filter(
    (b) => b.action === 'create_new_brand_page' || b.action === 'create_house_brand_page'
  );
  console.log(`\nWrote ${productsPath}`);
  console.log(`Wrote ${brandsPath}`);
  console.log(`Products: ${productRows.length} | Brands: ${brandRows.length} | New pages: ${newPages.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
