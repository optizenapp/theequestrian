#!/usr/bin/env node
/**
 * One-off: apply vendor status-sync schema additions, enable sync_status for
 * Ascot Saddlery + Trialrace, and report on which vendor connections exist.
 *
 *   node scripts/apply-vendor-status-sync.mjs
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) throw new Error('Missing DATABASE_URL');

const sql = neon(dbUrl);

console.log('--- 1. Add sync_status column on vendor_shop_connections (idempotent)');
await sql`
  ALTER TABLE vendor_shop_connections
    ADD COLUMN IF NOT EXISTS sync_status BOOLEAN NOT NULL DEFAULT false
`;
console.log('   ok');

console.log('--- 2. Create vendor_product_status table (idempotent)');
await sql`
  CREATE TABLE IF NOT EXISTS vendor_product_status (
    id SERIAL PRIMARY KEY,
    vendor_connection_id INTEGER NOT NULL REFERENCES vendor_shop_connections (id) ON DELETE CASCADE,
    vendor_shopify_product_id TEXT NOT NULL,
    marketplace_product_id TEXT,
    vendor_status TEXT NOT NULL CHECK (vendor_status IN ('active', 'draft', 'archived', 'deleted')),
    last_webhook_topic TEXT,
    last_webhook_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (vendor_connection_id, vendor_shopify_product_id)
  )
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_vendor_product_status_marketplace
    ON vendor_product_status (marketplace_product_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_vendor_product_status_non_active
    ON vendor_product_status (vendor_connection_id, vendor_status)
    WHERE vendor_status <> 'active'
`;
console.log('   ok');

console.log('--- 3. Existing vendor_shop_connections');
const existing = await sql`
  SELECT id, shop_domain, marketplace_vendor_name, is_active,
    sync_inventory, sync_price, sync_status, reconcile_enabled
  FROM vendor_shop_connections
  ORDER BY id
`;
console.table(existing);

console.log('--- 4. Enable sync_status for Ascot Saddlery + Trialrace');
const updated = await sql`
  UPDATE vendor_shop_connections
  SET sync_status = true, updated_at = NOW()
  WHERE LOWER(TRIM(marketplace_vendor_name)) IN ('ascot saddlery', 'trialrace', 'trailrace')
     OR shop_domain ILIKE '%ascot%'
     OR shop_domain ILIKE '%trial%'
     OR shop_domain ILIKE '%trail%'
  RETURNING id, shop_domain, marketplace_vendor_name, sync_status
`;
console.log('   updated rows:');
console.table(updated);

console.log('--- 5. Final state for status-sync vendors');
const finalState = await sql`
  SELECT id, shop_domain, marketplace_vendor_name, access_token IS NOT NULL AS has_token,
    sync_inventory, sync_price, sync_status, reconcile_enabled
  FROM vendor_shop_connections
  WHERE sync_status = true
  ORDER BY id
`;
console.table(finalState);

console.log('done');
