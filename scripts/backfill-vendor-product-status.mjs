#!/usr/bin/env node
/**
 * For every vendor with sync_status = true, walk every distinct mapped vendor
 * product, fetch its current status from the vendor's Shopify admin API,
 * write the snapshot into vendor_product_status, and report which marketplace
 * products are currently active despite vendor saying draft/archived.
 *
 * Dry-run by default. Pass --apply to also flip marketplace status to 'draft'
 * and zero inventory across mapped variants for the divergent products.
 *
 *   node scripts/backfill-vendor-product-status.mjs                                   # report only, all vendors
 *   node scripts/backfill-vendor-product-status.mjs --vendor trailrace                # one vendor only
 *   node scripts/backfill-vendor-product-status.mjs --limit 50                        # first 50 per vendor
 *   node scripts/backfill-vendor-product-status.mjs --quiet                           # suppress per-product log lines
 *   node scripts/backfill-vendor-product-status.mjs --export safe-list.csv            # write SAFE-to-draft list to CSV
 *   node scripts/backfill-vendor-product-status.mjs --apply                           # PHASE 3: actually draft the SAFE list
 *
 * Aggregation rule: a marketplace product is only flipped to draft when EVERY
 * vendor product mapping into it is non-active. Multi-source listings with at
 * least one still-active mapping are reported as 'blocked' and never touched.
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

function flag(name) {
  return process.argv.includes(name);
}
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
function numArg(name) {
  const v = arg(name);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const APPLY = flag('--apply');
const QUIET = flag('--quiet');
const VENDOR_FILTER = arg('--vendor')?.toLowerCase() ?? null;
const LIMIT = numArg('--limit');
const REQUEST_DELAY_MS = numArg('--delay') ?? 1100; // ~0.9 req/s, headroom for parallel marketplace calls
const BATCH_SIZE = numArg('--batch') ?? 50; // Shopify allows up to 250 ids per /products.json call
const MAX_RETRIES = numArg('--retries') ?? 12;
const EXPORT_PATH = arg('--export') ?? null;
const VENDOR_API = '2025-01';
const MARKET_API = '2025-01';

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) throw new Error('Missing DATABASE_URL');
const MARKET_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const MARKET_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
if (!MARKET_DOMAIN || !MARKET_TOKEN) throw new Error('Missing SHOPIFY_STORE_DOMAIN/TOKEN');

const sql = neon(dbUrl);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
function logLine(s) {
  console.log(`[${now()}] ${s}`);
}
function fmtETA(scanned, total, startedAt) {
  if (scanned === 0) return '?';
  const elapsedSec = (Date.now() - startedAt) / 1000;
  const rate = scanned / elapsedSec;
  const remainingSec = (total - scanned) / Math.max(rate, 0.01);
  const mins = Math.floor(remainingSec / 60);
  const secs = Math.round(remainingSec % 60);
  return `${mins}m${String(secs).padStart(2, '0')}s @ ${rate.toFixed(2)}/s`;
}

async function shopifyFetch(url, init, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      const wait = Math.min(60_000, 1500 * 2 ** Math.min(attempt - 1, 5));
      logLine(`  network error ${label} attempt ${attempt}: ${e.message}; sleeping ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = retryAfter > 0
        ? retryAfter * 1000
        : Math.min(60_000, 1500 * 2 ** Math.min(attempt - 1, 5));
      logLine(`  rate-limited ${label} attempt ${attempt}/${MAX_RETRIES}, sleeping ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      const wait = Math.min(30_000, 1500 * 2 ** Math.min(attempt - 1, 4));
      logLine(`  server ${res.status} ${label} attempt ${attempt}/${MAX_RETRIES}, sleeping ${wait}ms`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  logLine(`  GAVE UP ${label} after ${MAX_RETRIES} attempts`);
  return null;
}

/**
 * Batch-fetch product status. Shopify GET /products.json?ids=... returns up to
 * 250 products in a single request (counts as 1 call against the leaky bucket).
 * Returns Map<productIdString, statusString>. IDs missing from the response are
 * treated as 'deleted' (the product no longer exists on the source store).
 */
/** Coerce any vendor status into one of the four allowed by the DB CHECK constraint. */
function normalizeStatus(raw, productId) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'active' || s === 'draft' || s === 'archived' || s === 'deleted') return s;
  logLine(`  WARN: unrecognized status "${raw}" for product ${productId} → coercing to 'draft'`);
  return 'draft';
}

async function fetchProductStatusesBatch(shopHost, token, productIds, label) {
  if (productIds.length === 0) return new Map();
  const ids = productIds.map(String).join(',');
  const url = `https://${shopHost}/admin/api/${VENDOR_API}/products.json?ids=${ids}&fields=id,status&limit=250`;
  const res = await shopifyFetch(
    url,
    { headers: { 'X-Shopify-Access-Token': token } },
    `${label} batch ${productIds.length}`
  );
  const map = new Map();
  if (!res || !res.ok) {
    if (res) logLine(`  ${label} batch fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
    // Skip this batch entirely; do NOT mark missing products as deleted because
    // we never actually heard back from Shopify.
    return null;
  }
  const data = await res.json();
  for (const p of data.products || []) {
    map.set(String(p.id), normalizeStatus(p.status, p.id));
  }
  for (const id of productIds) {
    const key = String(id);
    if (!map.has(key)) map.set(key, 'deleted');
  }
  return map;
}

async function fetchVendorStatuses(shop, token, productIds) {
  const host = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return fetchProductStatusesBatch(host, token, productIds, `vendor ${shop}`);
}

async function fetchMarketplaceStatuses(productIds) {
  const host = MARKET_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return fetchProductStatusesBatch(host, MARKET_TOKEN, productIds, 'marketplace');
}

async function setMarketplaceDraft(productId) {
  const host = MARKET_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await shopifyFetch(
    `https://${host}/admin/api/${MARKET_API}/products/${productId}.json`,
    {
      method: 'PUT',
      headers: { 'X-Shopify-Access-Token': MARKET_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: { id: Number(productId), status: 'draft' } }),
    },
    `set draft ${productId}`
  );
  if (!res.ok) throw new Error(`set draft ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function zeroInventory(inventoryItemId, locationId) {
  const host = MARKET_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await shopifyFetch(
    `https://${host}/admin/api/${MARKET_API}/inventory_levels/set.json`,
    {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': MARKET_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: Number(locationId),
        inventory_item_id: Number(inventoryItemId),
        available: 0,
      }),
    },
    `zero inv ${inventoryItemId}`
  );
  if (!res.ok) throw new Error(`zero inv ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function upsertStatusRow(connectionId, vendorProductId, mpProductId, status) {
  await sql`
    INSERT INTO vendor_product_status (
      vendor_connection_id, vendor_shopify_product_id, marketplace_product_id,
      vendor_status, last_webhook_topic, last_webhook_at
    ) VALUES (
      ${connectionId}, ${vendorProductId}, ${mpProductId},
      ${status}, 'backfill', NOW()
    )
    ON CONFLICT (vendor_connection_id, vendor_shopify_product_id) DO UPDATE SET
      marketplace_product_id = COALESCE(EXCLUDED.marketplace_product_id, vendor_product_status.marketplace_product_id),
      vendor_status = EXCLUDED.vendor_status,
      last_webhook_topic = 'backfill',
      last_webhook_at = NOW(),
      updated_at = NOW()
  `;
}

const vendors = (
  await sql`
    SELECT id, shop_domain, marketplace_vendor_name, access_token
    FROM vendor_shop_connections
    WHERE is_active = true AND sync_status = true
    ORDER BY id
  `
).filter((v) =>
  VENDOR_FILTER
    ? v.shop_domain.toLowerCase().includes(VENDOR_FILTER) ||
      v.marketplace_vendor_name.toLowerCase().includes(VENDOR_FILTER)
    : true
);

logLine(`Mode: ${APPLY ? 'APPLY (will draft + zero divergent products)' : 'DRY-RUN (report only, no Shopify writes)'}`);
logLine(`Marketplace: ${MARKET_DOMAIN}`);
if (VENDOR_FILTER) logLine(`Vendor filter: ${VENDOR_FILTER}`);
if (LIMIT) logLine(`Limit per vendor: ${LIMIT}`);
logLine(`Per-call delay: ${REQUEST_DELAY_MS}ms   batch size: ${BATCH_SIZE}`);
logLine(`Vendors to scan: ${vendors.length}`);
logLine('');

const summary = [];

for (const v of vendors) {
  try {
  logLine(`=== ${v.shop_domain} (${v.marketplace_vendor_name})`);
  const allProducts = await sql`
    SELECT DISTINCT vendor_shopify_product_id, marketplace_product_id
    FROM vendor_inventory_map
    WHERE vendor_connection_id = ${v.id}
      AND status = 'active'
    ORDER BY vendor_shopify_product_id
  `;
  const products = LIMIT ? allProducts.slice(0, LIMIT) : allProducts;
  const total = products.length;
  logLine(
    `   distinct mapped products: ${total}${LIMIT ? ` (capped from ${allProducts.length})` : ''}`
  );
  const totalBatches = Math.ceil(total / BATCH_SIZE);
  logLine(`   batches: ${totalBatches} × ${BATCH_SIZE}`);
  const startedAt = Date.now();

  let scanned = 0;
  let nonActive = 0;
  let drifted = 0;
  let fixed = 0;
  let batchIdx = 0;

  let skippedBatches = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    batchIdx += 1;
    const batch = products.slice(i, i + BATCH_SIZE);
    const vendorIds = batch.map((p) => p.vendor_shopify_product_id);
    const t0 = Date.now();
    const vendorStatuses = await fetchVendorStatuses(v.shop_domain, v.access_token, vendorIds);
    if (REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS);

    if (vendorStatuses === null) {
      skippedBatches += 1;
      logLine(`  -- batch ${batchIdx}/${totalBatches} SKIPPED (vendor unreachable)`);
      continue;
    }

    const candidates = batch.filter(
      (p) => (vendorStatuses.get(String(p.vendor_shopify_product_id)) ?? 'active') !== 'active'
    );
    let marketplaceStatuses = new Map();
    if (candidates.length > 0) {
      const mp = await fetchMarketplaceStatuses(
        candidates.map((p) => p.marketplace_product_id)
      );
      marketplaceStatuses = mp ?? new Map();
      if (REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS);
    }

    for (const p of batch) {
      scanned += 1;
      const vendorStatus = vendorStatuses.get(String(p.vendor_shopify_product_id));
      if (!vendorStatus) {
        if (!QUIET) logLine(`  [${scanned}/${total}] vproduct=${p.vendor_shopify_product_id}  vendor=<error>`);
        continue;
      }
      await upsertStatusRow(v.id, p.vendor_shopify_product_id, p.marketplace_product_id, vendorStatus);

      if (vendorStatus === 'active') {
        if (!QUIET) {
          logLine(`  [${scanned}/${total}] vproduct=${p.vendor_shopify_product_id}  vendor=active`);
        }
        continue;
      }
      nonActive += 1;
      const mpStatus = marketplaceStatuses.get(String(p.marketplace_product_id)) ?? null;
      const drift = mpStatus === 'active';
      if (drift) {
        drifted += 1;
        if (!QUIET) {
          logLine(
            `  drift   [${scanned}/${total}]  vendor=${vendorStatus}  marketplace=active  vproduct=${p.vendor_shopify_product_id}  mproduct=${p.marketplace_product_id}`
          );
        }
      } else if (!QUIET) {
        logLine(
          `  [${scanned}/${total}] vproduct=${p.vendor_shopify_product_id}  vendor=${vendorStatus}  marketplace=${mpStatus ?? 'unknown'}`
        );
      }
    }

    const batchSec = ((Date.now() - t0) / 1000).toFixed(1);
    logLine(
      `  -- batch ${batchIdx}/${totalBatches} done in ${batchSec}s  scanned=${scanned}/${total}  non_active=${nonActive}  drift=${drifted}  ETA ${fmtETA(scanned, total, startedAt)}`
    );
  }

  const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
  logLine(
    `   scan summary [${mins}m]: scanned=${scanned}  vendor_non_active=${nonActive}  raw_drifted=${drifted}  skipped_batches=${skippedBatches}`
  );
  summary.push({
    vendor: v.marketplace_vendor_name,
    scanned,
    nonActive,
    drifted,
    skippedBatches,
  });
  } catch (e) {
    logLine(`   FATAL on ${v.shop_domain}: ${e.message}; continuing with next vendor`);
    summary.push({ vendor: v.marketplace_vendor_name, error: e.message });
  }
}

logLine('');
logLine('=== scan phase summary');
console.table(summary);

// ---------------------------------------------------------------------------
// PHASE 2: aggregation. Use the snapshot we just wrote into vendor_product_status
// to find marketplace products where EVERY mapped vendor product is non-active.
// Only those are safe to draft. Multi-source listings (any active sibling) are
// excluded so we never kill a legitimately stocked product.
// ---------------------------------------------------------------------------
logLine('');
logLine('=== phase 2: marketplace aggregation');

const aggRows = await sql`
  WITH per_mp AS (
    SELECT m.marketplace_product_id,
      SUM(CASE WHEN s.vendor_status = 'active' THEN 1 ELSE 0 END) AS active_mappings,
      SUM(CASE WHEN s.vendor_status IS NOT NULL AND s.vendor_status <> 'active' THEN 1 ELSE 0 END) AS non_active_mappings,
      SUM(CASE WHEN s.vendor_status IS NULL THEN 1 ELSE 0 END) AS unknown_mappings,
      COUNT(*) AS total_mappings
    FROM vendor_inventory_map m
    LEFT JOIN vendor_product_status s
      ON s.vendor_connection_id = m.vendor_connection_id
     AND s.vendor_shopify_product_id = m.vendor_shopify_product_id
    WHERE m.status = 'active'
    GROUP BY m.marketplace_product_id
  )
  SELECT marketplace_product_id, active_mappings, non_active_mappings, unknown_mappings, total_mappings
  FROM per_mp
  WHERE non_active_mappings > 0
  ORDER BY marketplace_product_id
`;

const safeToDraft = aggRows.filter(
  (r) => Number(r.active_mappings) === 0 && Number(r.unknown_mappings) === 0
);
const blockedByActiveSibling = aggRows.filter((r) => Number(r.active_mappings) > 0);
const blockedByUnknown = aggRows.filter(
  (r) => Number(r.active_mappings) === 0 && Number(r.unknown_mappings) > 0
);

logLine(`  total marketplace products with at least one non-active mapping: ${aggRows.length}`);
logLine(`  SAFE to draft (all mappings non-active): ${safeToDraft.length}`);
logLine(`  blocked: has active sibling mapping: ${blockedByActiveSibling.length}`);
logLine(`  blocked: has un-snapshotted mapping (unknown_mappings > 0): ${blockedByUnknown.length}`);

if (EXPORT_PATH) {
  const fs = await import('node:fs/promises');
  const header = 'marketplace_product_id,active_mappings,non_active_mappings,unknown_mappings,total_mappings';
  const lines = safeToDraft.map(
    (r) => `${r.marketplace_product_id},${r.active_mappings},${r.non_active_mappings},${r.unknown_mappings},${r.total_mappings}`
  );
  await fs.writeFile(EXPORT_PATH, [header, ...lines].join('\n'), 'utf8');
  logLine(`  exported safe-to-draft list to ${EXPORT_PATH} (${safeToDraft.length} rows)`);
}

if (!APPLY) {
  logLine('');
  logLine('Dry-run complete. Re-run with --apply to draft the SAFE list (active siblings will be skipped).');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// PHASE 3: apply. Walk the safe-to-draft set and set marketplace status=draft
// then zero inventory across all variants on those products.
// ---------------------------------------------------------------------------
logLine('');
logLine('=== phase 3: applying drafts to safe list');

let appliedDrafts = 0;
let appliedZeroLevels = 0;
let applyFailures = 0;
let processed = 0;

for (const row of safeToDraft) {
  processed += 1;
  const mpId = String(row.marketplace_product_id);
  try {
    await setMarketplaceDraft(mpId);
    appliedDrafts += 1;
    const variants = await sql`
      SELECT DISTINCT marketplace_inventory_item_id, marketplace_location_id
      FROM vendor_inventory_map
      WHERE marketplace_product_id = ${mpId}
        AND status = 'active'
    `;
    for (const variant of variants) {
      await zeroInventory(variant.marketplace_inventory_item_id, variant.marketplace_location_id);
      appliedZeroLevels += 1;
      if (REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS);
    }
    logLine(
      `  [${processed}/${safeToDraft.length}] DRAFTED mproduct=${mpId} (${variants.length} levels zeroed)`
    );
  } catch (e) {
    applyFailures += 1;
    logLine(`  [${processed}/${safeToDraft.length}] FAILED mproduct=${mpId}: ${e.message}`);
  }
  if (REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS);
}

logLine('');
logLine('=== apply summary');
logLine(`  drafted: ${appliedDrafts}`);
logLine(`  inventory levels zeroed: ${appliedZeroLevels}`);
logLine(`  failures: ${applyFailures}`);
