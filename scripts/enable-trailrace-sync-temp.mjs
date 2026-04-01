import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const targetDbUrl = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
if (!targetDbUrl) throw new Error('Missing target DB URL');

const sourceDbUrl = 'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const source = neon(sourceDbUrl);
const target = neon(targetDbUrl);

await target`ALTER TABLE vendor_shop_connections ADD COLUMN IF NOT EXISTS sync_inventory BOOLEAN NOT NULL DEFAULT true`;
await target`ALTER TABLE vendor_shop_connections ADD COLUMN IF NOT EXISTS reconcile_enabled BOOLEAN NOT NULL DEFAULT false`;
await target`ALTER TABLE vendor_shop_connections ADD COLUMN IF NOT EXISTS reconcile_cooldown_seconds INTEGER NOT NULL DEFAULT 20`;
await target`ALTER TABLE vendor_shop_connections ADD COLUMN IF NOT EXISTS last_reconcile_at TIMESTAMPTZ`;

const sourceRows = await source`
  SELECT shop_domain, marketplace_vendor_name, access_token,
         inventory_strategy, primary_location_id, allowed_location_ids,
         sync_price, is_active
  FROM vendor_shop_connections
  WHERE LOWER(TRIM(shop_domain)) = ${'trailrace.myshopify.com'}
  ORDER BY id DESC
  LIMIT 1
`;

if (sourceRows.length === 0) {
  throw new Error('Trailrace row not found in source DB');
}

const row = sourceRows[0];

await target`
  INSERT INTO vendor_shop_connections (
    shop_domain,
    marketplace_vendor_name,
    access_token,
    inventory_strategy,
    primary_location_id,
    allowed_location_ids,
    sync_inventory,
    sync_price,
    reconcile_enabled,
    reconcile_cooldown_seconds,
    is_active,
    updated_at
  ) VALUES (
    ${String(row.shop_domain).toLowerCase().trim()},
    ${String(row.marketplace_vendor_name).trim()},
    ${String(row.access_token)},
    ${String(row.inventory_strategy || 'single_location')},
    ${row.primary_location_id ? String(row.primary_location_id) : null},
    ${row.allowed_location_ids ?? []},
    ${true},
    ${true},
    ${true},
    ${20},
    ${true},
    NOW()
  )
  ON CONFLICT (shop_domain) DO UPDATE SET
    marketplace_vendor_name = EXCLUDED.marketplace_vendor_name,
    access_token = EXCLUDED.access_token,
    inventory_strategy = EXCLUDED.inventory_strategy,
    primary_location_id = EXCLUDED.primary_location_id,
    allowed_location_ids = EXCLUDED.allowed_location_ids,
    sync_inventory = EXCLUDED.sync_inventory,
    sync_price = EXCLUDED.sync_price,
    reconcile_enabled = EXCLUDED.reconcile_enabled,
    reconcile_cooldown_seconds = EXCLUDED.reconcile_cooldown_seconds,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
`;

const verify = await target`
  SELECT id, shop_domain, marketplace_vendor_name, sync_inventory, sync_price, reconcile_enabled, reconcile_cooldown_seconds, is_active
  FROM vendor_shop_connections
  WHERE LOWER(TRIM(shop_domain)) = ${'trailrace.myshopify.com'}
`;

console.log('enabled_rows', verify.length);
console.log(verify[0]);
