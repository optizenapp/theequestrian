#!/usr/bin/env tsx
/**
 * Map Collective Breyer product types → /accessories/gifts (same PLP as existing Breyer).
 *
 *   npx tsx scripts/apply-breyer-type-mapping.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

const TYPES = [
  'Toys Breyer Freedom / Classics Series 1:12',
  'Toys Breyer Activity, Paint & Play',
  'Toys Breyer Farms',
  'Toys Breyer Stablemates Series 1:32',
];

async function main(): Promise<void> {
  for (const productType of TYPES) {
    const row = await sql`
      INSERT INTO collection_mapping (
        top_level, parent_category, subcategory_handle, product_type, action, notes
      ) VALUES (
        'accessories', '', 'gifts', ${productType}, 'include',
        'Breyer Horses Australia Collective — same PLP as existing Breyer gifts'
      )
      ON CONFLICT (top_level, parent_category, subcategory_handle, product_type)
      DO UPDATE SET action = 'include', notes = EXCLUDED.notes, updated_at = NOW()
      RETURNING id, product_type
    `;
    console.log('mapping:', row[0]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
