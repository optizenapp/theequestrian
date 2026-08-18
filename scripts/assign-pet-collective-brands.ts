#!/usr/bin/env tsx
/**
 * Assign product-brand columns for pet Collective vendors from title/handle patterns.
 *
 *   npx tsx scripts/assign-pet-collective-brands.ts --floral-prod --handles-file=exports/wa-dog-grooming-supplies-drafts.csv
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { getArg, loadHandlesFromFile } from './lib/migration-cli';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

const BRANDS: Array<{ brand: string; hub: string; match: (t: string, h: string) => boolean }> = [
  { brand: 'iGroom', hub: 'igroom', match: (t, h) => /igroom/i.test(t) || h.startsWith('igroom-') },
  { brand: 'ProGroom', hub: 'progroom', match: (t, h) => /progroom/i.test(t) || h.startsWith('progroom-') },
  { brand: 'FurEx', hub: 'furex', match: (t, h) => /furex/i.test(t) || h.startsWith('furex-') },
  {
    brand: 'Luxe Pet',
    hub: 'luxe-pet',
    match: (t, h) => /luxe pet/i.test(t) || h.startsWith('luxe-pet-'),
  },
  {
    brand: 'Plush Puppy',
    hub: 'plush-puppy',
    match: (t, h) => /plush puppy/i.test(t) || h.startsWith('plush-puppy-'),
  },
  {
    brand: 'Melanie Newman',
    hub: 'melanie-newman',
    match: (t, h) => /melanie newman/i.test(t) || h.startsWith('melanie-newman-'),
  },
];

/** House-brand fallback: Collective vendor SKUs with no named line (Luxe Pet wins first). */
function matchPetFoodAustraliaVendor(vendor: string | null): boolean {
  return vendor?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === 'petfoodaustralia';
}

async function main(): Promise<void> {
  const handlesFile = getArg('--handles-file');
  if (!handlesFile) {
    console.error('Usage: --handles-file=exports/...-drafts.csv');
    process.exit(1);
  }
  const handles = loadHandlesFromFile(handlesFile);
  await ensureProductsBrandColumns();

  const rows = (await sql`
    SELECT id, handle, title, vendor FROM products WHERE handle = ANY(${handles})
  `) as unknown as Array<{
    id: string;
    handle: string;
    title: string | null;
    vendor: string | null;
  }>;

  let updated = 0;
  for (const row of rows) {
    const title = row.title || '';
    const handle = row.handle.toLowerCase();
    const hit =
      BRANDS.find((b) => b.match(title, handle)) ||
      (matchPetFoodAustraliaVendor(row.vendor)
        ? { brand: 'Pet Food Australia', hub: 'pet-food-australia' }
        : undefined);
    if (!hit) continue;
    await sql`
      UPDATE products
      SET brand = ${hit.brand},
          brand_hub_handle = ${hit.hub},
          updated_at = NOW()
      WHERE id = ${row.id}
    `;
    updated += 1;
  }
  console.log(`Brand assigned: ${updated} / ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
