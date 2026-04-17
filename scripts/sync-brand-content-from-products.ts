#!/usr/bin/env tsx
/**
 * Upsert brand_content rows from distinct products.brand (canonical).
 * Refreshes products_count; sets rules to BRAND match only when rules was empty.
 *
 * Usage: npx tsx scripts/sync-brand-content-from-products.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
import { invalidateBrandContentCache } from '@/lib/content/brand-content';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main(): Promise<void> {
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
  for (const row of counts) {
    const name = row.name.trim();
    const cnt = Number(row.cnt);
    const handle = row.handle;
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

  invalidateBrandContentCache();
  console.log(`Brand names from products: ${counts.length}, upsert operations: ${upserted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
