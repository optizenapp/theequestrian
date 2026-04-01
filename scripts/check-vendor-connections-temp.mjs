import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const dbUrl = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) throw new Error('Missing CUSTOM_DATABASE_URL/DATABASE_URL');

const sql = neon(dbUrl);
const rows = await sql`
  SELECT id, shop_domain, marketplace_vendor_name, is_active, sync_inventory, sync_price, reconcile_enabled
  FROM vendor_shop_connections
  ORDER BY id DESC
  LIMIT 50
`;
console.log(rows);
