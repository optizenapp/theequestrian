#!/usr/bin/env tsx
/**
 * Upsert brand_content rows from distinct products.brand (canonical).
 * Refreshes products_count; sets rules to BRAND match only when rules was empty.
 * Zeros products_count for published hubs with no matching products.
 *
 * Usage:
 *   npx tsx scripts/sync-brand-content-from-products.ts
 *   npx tsx scripts/sync-brand-content-from-products.ts --floral-prod
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
import { isBlockedBrandCandidate } from '@/lib/brands/blocked-brands';
import { invalidateBrandContentCache } from '@/lib/content/brand-content';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main(): Promise<void> {
  if (process.argv.includes('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database (ep-floral-wind)\n');
  }

  // Lazy import after DB URL override
  const { sql } = await import('@/lib/db/client');

  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_hub_handle TEXT`;

  const rows = (await sql`
    SELECT TRIM(brand) AS name, NULLIF(TRIM(brand_hub_handle), '') AS hub
    FROM products
    WHERE brand IS NOT NULL AND TRIM(brand) <> ''
  `) as unknown as Array<{ name: string; hub: string | null }>;

  const byName = new Map<string, { count: number; hubVotes: Map<string, number> }>();
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) continue;
    const rec = byName.get(name) ?? { count: 0, hubVotes: new Map<string, number>() };
    rec.count += 1;
    if (r.hub) rec.hubVotes.set(r.hub, (rec.hubVotes.get(r.hub) ?? 0) + 1);
    byName.set(name, rec);
  }

  const counts = [...byName.entries()]
    .map(([name, v]) => {
      let handle = slugFromBrandName(name);
      if (v.hubVotes.size > 0) {
        let best = '';
        let bestN = -1;
        for (const [h, n] of v.hubVotes) {
          if (n > bestN) {
            best = h;
            bestN = n;
          }
        }
        if (best) handle = best;
      }
      return { name, cnt: v.count, handle };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let upserted = 0;
  let skippedBlocked = 0;
  const activeHandles = new Set<string>();
  for (const row of counts) {
    const name = row.name.trim();
    const cnt = Number(row.cnt);
    const handle = row.handle;
    if (isBlockedBrandCandidate({ handle, brand: name })) {
      skippedBlocked++;
      continue;
    }
    activeHandles.add(handle);
    const rules = JSON.stringify([{ column: 'BRAND', relation: 'EQUALS', condition: name }]);
    const metaTitle = `${name} | The Equestrian`;
    const metaDescription = `Shop ${name} at The Equestrian.`;
    const shortDescription = `Browse ${name} products.`;
    const longDescription = `<h2>${name}</h2><p>Shop ${name} at The Equestrian.</p>`;

    await sql`
      INSERT INTO brand_content (
        handle,
        title,
        products_count,
        rules,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${handle},
        ${name},
        ${cnt},
        ${rules},
        ${name},
        ${metaTitle},
        ${metaDescription},
        ${shortDescription},
        ${longDescription},
        ${name},
        '[]',
        'published',
        NOW(),
        NOW()
      )
      ON CONFLICT (handle) DO UPDATE SET
        products_count = EXCLUDED.products_count,
        rules = CASE
          WHEN brand_content.rules IS NULL OR TRIM(COALESCE(brand_content.rules, '')) = ''
            THEN EXCLUDED.rules
          ELSE brand_content.rules
        END,
        updated_at = NOW()
    `;
    upserted++;
  }

  // Zero counts for hubs with no products so A–Z / nav hide empty brands.
  const zeroed = (await sql`
    UPDATE brand_content
    SET products_count = 0, updated_at = NOW()
    WHERE status = 'published'
      AND products_count > 0
      AND NOT (handle = ANY(${[...activeHandles]}))
    RETURNING handle
  `) as unknown as Array<{ handle: string }>;

  invalidateBrandContentCache();
  console.log(
    `Brand names from products: ${counts.length}, upsert operations: ${upserted}, skipped blocked: ${skippedBlocked}, zeroed empty: ${zeroed.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
