#!/usr/bin/env tsx
/**
 * Allocate Exclusively Equine house-brand products from the vendor's
 * /collections/exclusively-equine catalogue to products.brand + brand hub.
 *
 * Usage:
 *   npx tsx scripts/allocate-exclusively-equine-house-brand.ts
 *   npx tsx scripts/allocate-exclusively-equine-house-brand.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
import { hasFlag } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const COLLECTION_URL =
  'https://exclusivelyequine.com.au/collections/exclusively-equine/products.json';
const BRAND_LABEL = 'Exclusively Equine';
const HUB = slugFromBrandName(BRAND_LABEL);
const VENDOR = 'Exclusively Equine';

type VendorProduct = { handle: string; title: string };

async function fetchVendorCollectionProducts(): Promise<VendorProduct[]> {
  const products: VendorProduct[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = `${COLLECTION_URL}?limit=250&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Vendor collection fetch failed: ${res.status} ${url}`);
    const data = (await res.json()) as { products?: Array<{ handle: string; title: string }> };
    const batch = data.products ?? [];
    if (batch.length === 0) break;
    for (const p of batch) {
      products.push({ handle: p.handle.trim(), title: p.title.trim() });
    }
    if (batch.length < 250) break;
  }
  return products;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(title: string): Set<string> {
  const stop = new Set(['the', 'a', 'an', 'and', 'with', 'copy', 'of']);
  return new Set(
    normalizeTitle(title)
      .split(' ')
      .filter((t) => t.length > 1 && !stop.has(t))
  );
}

function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  return inter / Math.max(ta.size, tb.size);
}

/** Vendor collection handle → our marketplace handle when titles diverged. */
const VENDOR_HANDLE_ALIASES: Record<string, string[]> = {
  'i-am-invincible-statue': ['nobility-statue', 'nobility-statue-1'],
  'pony-bobby-pins': ['gold-pony-bobby-pins', 'gold-pony-bobby-pins-1'],
  'belt-7': ['snaffle-bit-chain-belt', 'snaffle-bit-chain-belt-1'],
  'ponies-scrunchie': ['ponies-scrunchie-q'],
  'light-pink-hot-pink-snaffle-bit-headband': ['pale-pink-hot-pink-snaffle-bit-headband'],
  'snaffle-bit-tray-set': ['snaffle-bit-tray', 'snaffle-bit-tray-2'],
  'snaffle-bit-throw-copy': ['snaffle-bit-throw', 'snaffle-bit-throw-1'],
  'cushion-cover-copy': ['grey-checked-cushion-cover'],
  'white-glitter-snaffle-belt-q': ['white-glitter-snaffle-belt'],
  'showjumper-tray': ['show-jumper-tray'],
};

async function main(): Promise<void> {
  if (hasFlag('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database (ep-floral-wind)\n');
  }

  const apply = hasFlag('--apply');
  console.log('Fetching vendor collection products…');
  const vendorProducts = await fetchVendorCollectionProducts();
  console.log(`Vendor collection: ${vendorProducts.length} products`);

  await ensureProductsBrandColumns();

  const vendorRows = (await sql`
    SELECT handle, title, brand, brand_hub_handle
    FROM products
    WHERE LOWER(TRIM(vendor)) = LOWER(TRIM(${VENDOR}))
  `) as Array<{
    handle: string;
    title: string | null;
    brand: string | null;
    brand_hub_handle: string | null;
  }>;

  const byHandle = new Map(vendorRows.map((r) => [r.handle.toLowerCase(), r]));
  const byTitle = new Map<string, typeof vendorRows>();
  for (const row of vendorRows) {
    const key = normalizeTitle(row.title || '');
    if (!key) continue;
    const list = byTitle.get(key) || [];
    list.push(row);
    byTitle.set(key, list);
  }

  type MatchRow = {
    vendor_handle: string;
    vendor_title: string;
    our_handle: string;
    our_title: string;
    match_type: 'handle' | 'title' | 'unmatched';
    previous_brand: string;
    previous_hub: string;
  };

  const matches: MatchRow[] = [];
  const usedOurHandles = new Set<string>();

  for (const vp of vendorProducts) {
    const aliasHandles = VENDOR_HANDLE_ALIASES[vp.handle] || [];
    const aliasHits = aliasHandles
      .map((h) => byHandle.get(h.toLowerCase()))
      .filter((r): r is NonNullable<typeof r> => Boolean(r && !usedOurHandles.has(r.handle)));
    if (aliasHits.length > 0) {
      for (const direct of aliasHits) {
        usedOurHandles.add(direct.handle);
        matches.push({
          vendor_handle: vp.handle,
          vendor_title: vp.title,
          our_handle: direct.handle,
          our_title: direct.title || '',
          match_type: 'handle',
          previous_brand: direct.brand || '',
          previous_hub: direct.brand_hub_handle || '',
        });
      }
      continue;
    }

    const direct = byHandle.get(vp.handle.toLowerCase());
    if (direct) {
      if (usedOurHandles.has(direct.handle)) {
        continue;
      }
      usedOurHandles.add(direct.handle);
      matches.push({
        vendor_handle: vp.handle,
        vendor_title: vp.title,
        our_handle: direct.handle,
        our_title: direct.title || '',
        match_type: 'handle',
        previous_brand: direct.brand || '',
        previous_hub: direct.brand_hub_handle || '',
      });
      continue;
    }

    const titleKey = normalizeTitle(vp.title);
    const titleHits = (byTitle.get(titleKey) || []).filter((r) => !usedOurHandles.has(r.handle));
    if (titleHits.length >= 1) {
      for (const hit of titleHits) {
        usedOurHandles.add(hit.handle);
        matches.push({
          vendor_handle: vp.handle,
          vendor_title: vp.title,
          our_handle: hit.handle,
          our_title: hit.title || '',
          match_type: 'title',
          previous_brand: hit.brand || '',
          previous_hub: hit.brand_hub_handle || '',
        });
      }
      continue;
    }

    const fuzzyCandidates = vendorRows
      .filter((r) => !usedOurHandles.has(r.handle))
      .map((r) => ({ row: r, score: titleSimilarity(vp.title, r.title || '') }))
      .filter((c) => c.score >= 0.72)
      .sort((a, b) => b.score - a.score);

    if (fuzzyCandidates.length >= 1) {
      const bestScore = fuzzyCandidates[0].score;
      const best = fuzzyCandidates.filter((c) => c.score >= bestScore - 0.05);
      for (const { row: hit } of best) {
        usedOurHandles.add(hit.handle);
        matches.push({
          vendor_handle: vp.handle,
          vendor_title: vp.title,
          our_handle: hit.handle,
          our_title: hit.title || '',
          match_type: 'title',
          previous_brand: hit.brand || '',
          previous_hub: hit.brand_hub_handle || '',
        });
      }
      continue;
    }

    matches.push({
      vendor_handle: vp.handle,
      vendor_title: vp.title,
      our_handle: '',
      our_title: '',
      match_type: 'unmatched',
      previous_brand: '',
      previous_hub: '',
    });
  }

  const matched = matches.filter((m) => m.match_type !== 'unmatched');
  const unmatched = matches.filter((m) => m.match_type === 'unmatched');
  const byHandleMatch = matches.filter((m) => m.match_type === 'handle').length;
  const byTitleMatch = matches.filter((m) => m.match_type === 'title').length;

  console.log(`Matched on our site: ${matched.length} (${byHandleMatch} by handle, ${byTitleMatch} by title)`);
  console.log(`Unmatched (vendor-only or not synced): ${unmatched.length}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });

  const reviewPath = resolve(process.cwd(), `exports/exclusively-equine-house-brand-match-${stamp}.csv`);
  writeFileSync(reviewPath, stringify(matches, { header: true }));
  console.log(`Wrote ${reviewPath}`);

  const applyRows = [...new Map(matched.map((m) => [m.our_handle, { handle: m.our_handle, brand: BRAND_LABEL }])).values()];
  const applyPath = resolve(process.cwd(), `exports/exclusively-equine-house-brand-apply-${stamp}.csv`);
  writeFileSync(applyPath, stringify(applyRows, { header: true }));
  console.log(`Wrote ${applyPath} (${applyRows.length} rows to brand)`);

  if (unmatched.length > 0) {
    console.log('\nUnmatched vendor collection products (first 20):');
    for (const row of unmatched.slice(0, 20)) {
      console.log(`  ${row.vendor_handle}\t${row.vendor_title}`);
    }
  }

  if (!apply) {
    console.log('\nDry run. Apply brand columns with:');
    console.log('  npx tsx scripts/allocate-exclusively-equine-house-brand.ts --floral-prod --apply');
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const row of applyRows) {
    const result = (await sql`
      UPDATE products
      SET brand = ${row.brand},
          brand_hub_handle = ${HUB},
          updated_at = NOW()
      WHERE handle = ${row.handle}
        AND LOWER(TRIM(vendor)) = LOWER(TRIM(${VENDOR}))
      RETURNING handle
    `) as Array<{ handle: string }>;
    if (result.length > 0) updated += 1;
    else skipped += 1;
  }

  const onHub = (await sql`
    SELECT COUNT(*)::int AS c
    FROM products
    WHERE brand_hub_handle = ${HUB}
      AND LOWER(TRIM(vendor)) = LOWER(TRIM(${VENDOR}))
  `) as Array<{ c: number }>;

  console.log(`\nApplied brand: ${updated} updated, ${skipped} skipped (handle not found / vendor mismatch)`);
  console.log(`Products on hub ${HUB}: ${onHub[0]?.c ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
