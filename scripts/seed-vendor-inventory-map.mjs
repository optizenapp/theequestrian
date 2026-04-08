/**
 * Generic vendor inventory map seeder.
 * Matches vendor store variants to marketplace variants by SKU, inserts into vendor_inventory_map.
 *
 * Required env vars:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN   Marketplace admin token (shpat_...)
 *   VENDOR_ACCESS_TOKEN          Vendor store access token (shpca_...)
 *   VENDOR_DOMAIN                e.g. jodhpurs-co.myshopify.com
 *   VENDOR_CONNECTION_ID         id from vendor_shop_connections table
 *   VENDOR_MARKETPLACE_NAME      Exact Product.vendor on marketplace (e.g. "Jodhpurs Co")
 *
 * Optional:
 *   VENDOR_LOCATION_ID           Vendor store location ID (auto-detected if omitted)
 *   MARKETPLACE_LOCATION_ID      Defaults to 62137499729
 */

import { neon } from '@neondatabase/serverless';

const DB_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const MARKETPLACE_DOMAIN = 'theequestrian.myshopify.com';
const MARKETPLACE_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const MARKETPLACE_LOCATION_ID = process.env.MARKETPLACE_LOCATION_ID ?? '62137499729';

const VENDOR_DOMAIN = process.env.VENDOR_DOMAIN;
const VENDOR_TOKEN = process.env.VENDOR_ACCESS_TOKEN;
const VENDOR_CONNECTION_ID = process.env.VENDOR_CONNECTION_ID
  ? Number(process.env.VENDOR_CONNECTION_ID)
  : null;
const VENDOR_MARKETPLACE_NAME = process.env.VENDOR_MARKETPLACE_NAME;

const missing = [
  !MARKETPLACE_ADMIN_TOKEN && 'SHOPIFY_ADMIN_ACCESS_TOKEN',
  !VENDOR_DOMAIN && 'VENDOR_DOMAIN',
  !VENDOR_TOKEN && 'VENDOR_ACCESS_TOKEN',
  !VENDOR_CONNECTION_ID && 'VENDOR_CONNECTION_ID',
  !VENDOR_MARKETPLACE_NAME && 'VENDOR_MARKETPLACE_NAME',
].filter(Boolean);

if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const sql = neon(DB_URL);

async function fetchAllVariants(domain, token, vendorFilter) {
  const variantsBySku = new Map();
  let url = vendorFilter
    ? `https://${domain}/admin/api/2026-01/products.json?limit=250&vendor=${encodeURIComponent(vendorFilter)}`
    : `https://${domain}/admin/api/2026-01/products.json?limit=250`;

  while (url) {
    const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const linkHeader = res.headers.get('link') || '';
    const data = await res.json();

    for (const product of data.products) {
      for (const variant of product.variants) {
        const sku = (variant.sku || '').trim().toLowerCase();
        if (!sku) continue;
        variantsBySku.set(sku, {
          productId: String(product.id),
          variantId: String(variant.id),
          inventoryItemId: String(variant.inventory_item_id),
          sku: (variant.sku || '').trim(),
        });
      }
    }

    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
    if (url) await new Promise(r => setTimeout(r, 300));
  }
  return variantsBySku;
}

async function getVendorLocationId() {
  if (process.env.VENDOR_LOCATION_ID) return process.env.VENDOR_LOCATION_ID;
  const res = await fetch(`https://${VENDOR_DOMAIN}/admin/api/2026-01/locations.json`, {
    headers: { 'X-Shopify-Access-Token': VENDOR_TOKEN },
  });
  if (!res.ok) throw new Error(`Locations fetch failed: ${res.status}`);
  const data = await res.json();
  const active = (data.locations ?? []).find(l => l.active);
  if (!active) throw new Error('No active location found on vendor store');
  console.log(`  Auto-detected vendor location: ${active.name} (${active.id})`);
  return String(active.id);
}

(async () => {
  console.log(`\nSeeding inventory map for ${VENDOR_DOMAIN} → "${VENDOR_MARKETPLACE_NAME}"`);
  console.log('─'.repeat(60));

  const vendorLocationId = await getVendorLocationId();

  console.log('Fetching vendor store variants...');
  const vendorVariants = await fetchAllVariants(VENDOR_DOMAIN, VENDOR_TOKEN, null);
  console.log(`  Found ${vendorVariants.size} SKUs in vendor store`);

  console.log(`Fetching marketplace variants for vendor "${VENDOR_MARKETPLACE_NAME}"...`);
  const marketplaceVariants = await fetchAllVariants(
    MARKETPLACE_DOMAIN,
    MARKETPLACE_ADMIN_TOKEN,
    VENDOR_MARKETPLACE_NAME
  );
  console.log(`  Found ${marketplaceVariants.size} SKUs in marketplace`);

  const rows = [];
  let skipped = 0;

  for (const [sku, mkt] of marketplaceVariants) {
    const vendor = vendorVariants.get(sku);
    if (!vendor) { skipped++; continue; }
    rows.push({ vendor, mkt, sku: mkt.sku });
  }

  console.log(`\nMatched: ${rows.length} | Unmatched (marketplace only): ${skipped}`);

  if (rows.length === 0) {
    console.log('Nothing to insert — check that SKUs match between the two stores.');
    return;
  }

  console.log(`\nInserting ${rows.length} rows into vendor_inventory_map...`);
  let inserted = 0;

  for (const { vendor, mkt, sku } of rows) {
    const result = await sql`
      INSERT INTO vendor_inventory_map (
        vendor_connection_id, vendor_shopify_product_id, vendor_shopify_variant_id,
        vendor_inventory_item_id, vendor_location_id,
        marketplace_product_id, marketplace_variant_id, marketplace_inventory_item_id,
        marketplace_location_id, sku, status
      ) VALUES (
        ${VENDOR_CONNECTION_ID}, ${vendor.productId}, ${vendor.variantId},
        ${vendor.inventoryItemId}, ${vendorLocationId},
        ${mkt.productId}, ${mkt.variantId}, ${mkt.inventoryItemId},
        ${MARKETPLACE_LOCATION_ID}, ${sku}, 'active'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;
    if ((result ?? []).length > 0) inserted++;
  }

  console.log(`Done. New rows inserted: ${inserted}`);

  const count = await sql`
    SELECT COUNT(*) FROM vendor_inventory_map WHERE vendor_connection_id = ${VENDOR_CONNECTION_ID}
  `;
  console.log(`Total mappings for this vendor in DB: ${count[0].count}`);
})();
