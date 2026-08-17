#!/usr/bin/env tsx
/**
 * Repair JNK Collective brand hub + product brand columns.
 *
 * - Publish brand_content hub jnk-collective
 * - Set VENDOR rules for Shopify vendor "JnK Collective" (+ JNK Collective)
 * - Backfill products.brand / brand_hub_handle for that vendor
 * - Refresh products_count
 *
 * Usage:
 *   npx tsx scripts/fix-jnk-collective-brand-hub.ts --floral-prod
 *   npx tsx scripts/fix-jnk-collective-brand-hub.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const HUB = 'jnk-collective';
const BRAND_LABEL = 'JNK Collective';
const VENDORS = ['JnK Collective', 'JNK Collective'] as const;

const RULES = JSON.stringify([
  { column: 'VENDOR', relation: 'EQUALS', condition: 'JnK Collective' },
  { column: 'VENDOR', relation: 'EQUALS', condition: 'JNK Collective' },
  { column: 'BRAND', relation: 'EQUALS', condition: BRAND_LABEL },
]);

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  if (hasFlag('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database\n');
  }

  const apply = hasFlag('--apply');
  const { sql } = await import('@/lib/db/client');
  const { ensureProductsBrandColumns } = await import('@/lib/db/ensure-products-brand-columns');
  const { ensureBrandContentColumns } = await import('@/lib/db/ensure-brand-content-columns');
  const { invalidateBrandContentCache } = await import('@/lib/content/brand-content');

  await ensureProductsBrandColumns();
  await ensureBrandContentColumns();

  const hubs = (await sql`
    SELECT handle, title, status, rules, COALESCE(products_count, 0) AS products_count,
           breadcrumb_label
    FROM brand_content
    WHERE handle = ${HUB}
    LIMIT 1
  `) as Array<{
    handle: string;
    title: string;
    status: string | null;
    rules: string | null;
    products_count: number;
    breadcrumb_label: string | null;
  }>;

  console.log('Current brand_content:', hubs[0] || '(missing)');

  const vendorProducts = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE brand_hub_handle = ${HUB})::int AS on_hub,
      COUNT(*) FILTER (WHERE brand IS NULL OR brand_hub_handle IS NULL)::int AS missing_brand
    FROM products
    WHERE LOWER(TRIM(vendor)) = ${VENDORS[0].toLowerCase()}
       OR LOWER(TRIM(vendor)) = ${VENDORS[1].toLowerCase()}
  `) as Array<{ total: number; on_hub: number; missing_brand: number }>;

  console.log('Vendor product stats:', vendorProducts[0]);

  const sample = (await sql`
    SELECT handle, vendor, brand, brand_hub_handle, available_for_sale, id
    FROM products
    WHERE LOWER(TRIM(vendor)) = ${VENDORS[0].toLowerCase()}
       OR LOWER(TRIM(vendor)) = ${VENDORS[1].toLowerCase()}
    ORDER BY handle
    LIMIT 8
  `) as Array<{
    handle: string;
    vendor: string | null;
    brand: string | null;
    brand_hub_handle: string | null;
    available_for_sale: boolean | null;
    id: string;
  }>;
  console.log('Sample products:');
  for (const row of sample) {
    console.log(
      `  ${row.handle} id=${row.id} vendor=${row.vendor} brand=${row.brand} hub=${row.brand_hub_handle} available_for_sale=${row.available_for_sale}`
    );
  }

  // Simulate brand PLP match (VENDOR + BRAND rules)
  const matched = (await sql`
    SELECT COUNT(*)::int AS c
    FROM products p
    WHERE (
      LOWER(COALESCE(p.vendor, '')) = ${'jnk collective'}
      OR LOWER(TRIM(COALESCE(p.brand, ''))) = ${'jnk collective'}
    )
  `) as Array<{ c: number }>;
  console.log('Rule-match count (vendor OR brand):', matched[0]?.c);

  const brandOnly = (await sql`
    SELECT COUNT(*)::int AS c
    FROM products p
    WHERE LOWER(TRIM(COALESCE(p.brand, ''))) = ${'jnk collective'}
  `) as Array<{ c: number }>;
  console.log('BRAND-only match:', brandOnly[0]?.c);

  const distinctBrand = (await sql`
    SELECT brand, COUNT(*)::int AS c
    FROM products
    WHERE LOWER(TRIM(vendor)) = ${VENDORS[0].toLowerCase()}
       OR LOWER(TRIM(vendor)) = ${VENDORS[1].toLowerCase()}
    GROUP BY brand
    ORDER BY c DESC
  `) as Array<{ brand: string | null; c: number }>;
  console.log('Distinct brand values for vendor:', distinctBrand);

  const avail = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE available_for_sale IS TRUE)::int AS avail_true,
      COUNT(*) FILTER (WHERE available_for_sale IS FALSE)::int AS avail_false,
      COUNT(*) FILTER (WHERE available_for_sale IS NULL)::int AS avail_null
    FROM products
    WHERE LOWER(TRIM(vendor)) = ${VENDORS[0].toLowerCase()}
       OR LOWER(TRIM(vendor)) = ${VENDORS[1].toLowerCase()}
  `) as Array<{ avail_true: number; avail_false: number; avail_null: number }>;
  console.log('available_for_sale breakdown:', avail[0]);

  if (!apply) {
    console.log('\nDry run — pass --apply to write hub rules + brand columns.');
    return;
  }

  if (!hubs.length) {
    await sql`
      INSERT INTO brand_content (
        handle, title, products_count, rules, h1_title, meta_title, meta_description,
        short_description, breadcrumb_label, status, created_at, updated_at
      ) VALUES (
        ${HUB},
        ${BRAND_LABEL},
        0,
        ${RULES},
        ${`Shop ${BRAND_LABEL}`},
        ${`${BRAND_LABEL} | The Equestrian`},
        ${`Shop ${BRAND_LABEL} equestrian apparel at The Equestrian.`},
        ${`Shop the full range of ${BRAND_LABEL} products.`},
        ${BRAND_LABEL},
        'published',
        NOW(),
        NOW()
      )
    `;
    console.log('Inserted brand_content hub');
  } else {
    await sql`
      UPDATE brand_content
      SET
        status = 'published',
        rules = ${RULES},
        breadcrumb_label = COALESCE(NULLIF(TRIM(breadcrumb_label), ''), ${BRAND_LABEL}),
        updated_at = NOW()
      WHERE handle = ${HUB}
    `;
    console.log('Updated brand_content hub → published + vendor rules');
  }

  const updated = (await sql`
    UPDATE products
    SET
      brand = ${BRAND_LABEL},
      brand_hub_handle = ${HUB},
      updated_at = NOW()
    WHERE (
        LOWER(TRIM(vendor)) = ${VENDORS[0].toLowerCase()}
        OR LOWER(TRIM(vendor)) = ${VENDORS[1].toLowerCase()}
      )
      AND (
        brand IS DISTINCT FROM ${BRAND_LABEL}
        OR brand_hub_handle IS DISTINCT FROM ${HUB}
      )
    RETURNING handle
  `) as Array<{ handle: string }>;

  console.log(`Backfilled brand columns on ${updated.length} products`);

  const countRows = (await sql`
    SELECT COUNT(*)::int AS c
    FROM products
    WHERE brand_hub_handle = ${HUB}
       OR LOWER(TRIM(vendor)) = ${VENDORS[0].toLowerCase()}
       OR LOWER(TRIM(vendor)) = ${VENDORS[1].toLowerCase()}
  `) as Array<{ c: number }>;
  const count = countRows[0]?.c ?? 0;

  await sql`
    UPDATE brand_content
    SET products_count = ${count}, updated_at = NOW()
    WHERE handle = ${HUB}
  `;
  console.log(`Set products_count=${count}`);

  invalidateBrandContentCache();
  console.log('Invalidated brand content cache');
  console.log('\nDone. Check /brands/jnk-collective');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
