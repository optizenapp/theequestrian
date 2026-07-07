#!/usr/bin/env tsx
/**
 * Backfill products.brand + products.brand_hub_handle for Collective migrations.
 * Mirrors onboard-vendor-products brand assignment for vendor-as-brand and title inference.
 *
 * Usage:
 *   npx tsx scripts/assign-vendor-product-brands.ts --floral-prod --vendor="QJ Riding Wear"
 *   npx tsx scripts/assign-vendor-product-brands.ts --floral-prod --vendor=Trailrace
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { assignBrandColumnsForVendor } from '@/lib/brands/assign-product-brand-columns';
import { getArg } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

async function main(): Promise<void> {
  const vendor = getArg('--vendor')?.trim();
  if (!vendor) {
    console.error('Usage: npx tsx scripts/assign-vendor-product-brands.ts --vendor="Vendor Name"');
    process.exit(1);
  }

  console.log(`Assigning brand columns for vendor: ${vendor}\n`);
  const updated = await assignBrandColumnsForVendor(vendor);
  console.log(`Updated: ${updated} products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
