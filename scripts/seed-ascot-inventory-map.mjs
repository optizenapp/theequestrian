/**
 * Seed vendor_inventory_map for Ascot Saddlery.
 *
 * Fetches all variants from:
 *   - Ascot's Shopify store (vendor side)
 *   - The marketplace (Shopify admin) for vendor = "Ascot Saddlery"
 *
 * Matches by SKU, then inserts rows into vendor_inventory_map.
 *
 * Run:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx node scripts/seed-ascot-inventory-map.mjs
 */

import { neon } from '@neondatabase/serverless';

const DB_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const MARKETPLACE_DOMAIN = 'theequestrian.myshopify.com';
const MARKETPLACE_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const MARKETPLACE_LOCATION_ID = '62137499729';

const ASCOT_DOMAIN = 'ascot-saddlery-vic.myshopify.com';
const ASCOT_TOKEN = process.env.ASCOT_ACCESS_TOKEN;
const ASCOT_LOCATION_ID = '66923200662';

if (!ASCOT_TOKEN) {
  console.error('Missing ASCOT_ACCESS_TOKEN env var (get from vendor_shop_connections table)');
  process.exit(1);
}
const ASCOT_CONNECTION_ID = 2;

const VENDOR_NAME = 'Ascot Saddlery';

if (!MARKETPLACE_ADMIN_TOKEN) {
  console.error('Missing SHOPIFY_ADMIN_ACCESS_TOKEN env var');
  process.exit(1);
}

const sql = neon(DB_URL);

async function shopifyGet(domain, token, path) {
  const url = `https://${domain}/admin/api/2026-01${path}`;
  const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

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
          title: product.title,
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

(async () => {
  console.log('Fetching Ascot vendor store variants...');
  const ascotVariants = await fetchAllVariants(ASCOT_DOMAIN, ASCOT_TOKEN, null);
  console.log(`  Found ${ascotVariants.size} SKUs in Ascot store`);

  console.log(`Fetching marketplace variants for vendor "${VENDOR_NAME}"...`);
  const marketplaceVariants = await fetchAllVariants(
    MARKETPLACE_DOMAIN,
    MARKETPLACE_ADMIN_TOKEN,
    VENDOR_NAME
  );
  console.log(`  Found ${marketplaceVariants.size} SKUs in marketplace`);

  const rows = [];
  let matched = 0;
  let skipped = 0;

  for (const [sku, mkt] of marketplaceVariants) {
    const vendor = ascotVariants.get(sku);
    if (!vendor) {
      skipped++;
      continue;
    }
    matched++;
    rows.push({
      vendor_connection_id: ASCOT_CONNECTION_ID,
      vendor_shopify_product_id: vendor.productId,
      vendor_shopify_variant_id: vendor.variantId,
      vendor_inventory_item_id: vendor.inventoryItemId,
      vendor_location_id: ASCOT_LOCATION_ID,
      marketplace_product_id: mkt.productId,
      marketplace_variant_id: mkt.variantId,
      marketplace_inventory_item_id: mkt.inventoryItemId,
      marketplace_location_id: MARKETPLACE_LOCATION_ID,
      sku: mkt.sku,
    });
  }

  console.log(`\nMatched: ${matched} | Unmatched (marketplace only): ${skipped}`);

  if (rows.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  console.log(`\nInserting ${rows.length} rows into vendor_inventory_map...`);
  let inserted = 0;
  let conflicts = 0;

  for (const r of rows) {
    const result = await sql`
      INSERT INTO vendor_inventory_map (
        vendor_connection_id,
        vendor_shopify_product_id,
        vendor_shopify_variant_id,
        vendor_inventory_item_id,
        vendor_location_id,
        marketplace_product_id,
        marketplace_variant_id,
        marketplace_inventory_item_id,
        marketplace_location_id,
        sku,
        status
      ) VALUES (
        ${r.vendor_connection_id},
        ${r.vendor_shopify_product_id},
        ${r.vendor_shopify_variant_id},
        ${r.vendor_inventory_item_id},
        ${r.vendor_location_id},
        ${r.marketplace_product_id},
        ${r.marketplace_variant_id},
        ${r.marketplace_inventory_item_id},
        ${r.marketplace_location_id},
        ${r.sku},
        'active'
      )
      ON CONFLICT ON CONSTRAINT idx_vendor_inventory_map_unique_row DO UPDATE SET
        vendor_shopify_product_id = EXCLUDED.vendor_shopify_product_id,
        vendor_shopify_variant_id = EXCLUDED.vendor_shopify_variant_id,
        marketplace_product_id = EXCLUDED.marketplace_product_id,
        marketplace_variant_id = EXCLUDED.marketplace_variant_id,
        marketplace_inventory_item_id = EXCLUDED.marketplace_inventory_item_id,
        marketplace_location_id = EXCLUDED.marketplace_location_id,
        sku = EXCLUDED.sku,
        status = 'active',
        updated_at = NOW()
      RETURNING (xmax = 0) AS was_inserted
    `;
    if (result[0]?.was_inserted) inserted++;
    else conflicts++;
  }

  console.log(`Done. New rows: ${inserted} | Updated existing: ${conflicts}`);

  const count = await sql`
    SELECT COUNT(*) FROM vendor_inventory_map WHERE vendor_connection_id = ${ASCOT_CONNECTION_ID}
  `;
  console.log(`Total Ascot mappings in DB: ${count[0].count}`);
})();
