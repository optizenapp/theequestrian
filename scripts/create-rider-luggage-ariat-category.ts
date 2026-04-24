#!/usr/bin/env tsx
/**
 * Upserts collection_content + collection_mapping for /rider/luggage/ariat.
 * Run: npx tsx scripts/create-rider-luggage-ariat-category.ts
 * Prod: npx tsx scripts/create-rider-luggage-ariat-category.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

const URL_PATH = '/rider/luggage/ariat';
const PARENT = '/rider/luggage';

/** Product types used under rider/luggage (same branch as parent mapping). */
const MAPPING_TYPES = [
  'RIDER: Luggage',
  'Wallets & Handbags',
  'Luggage',
  'Bag',
  'Gear Bag',
  'Accessories - Luggage',
  'Handbag',
  'Wallet',
  'Saddle Bag',
  'Bags',
  'backpack',
] as const;

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) throw new Error('POSTGRES_PASSWORD required for --floral-prod');
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  return cs;
}

async function main() {
  const sql = neon(resolveConnectionString());
  const dry = process.argv.includes('--dry-run');

  if (dry) {
    console.log('[dry-run] Would upsert collection_content + mapping rows for', URL_PATH);
    return;
  }

  const content = await sql`
    INSERT INTO collection_content (
      url_path, h1_title, meta_title, meta_description,
      short_description, long_description, breadcrumb_label, parent_url,
      category_level, status, default_sort, faq_items, related_categories, generated_by
    ) VALUES (
      ${URL_PATH},
      'Ariat Bags & Gear Bags',
      'Ariat Bags Australia | Gear Bags & Luggage | The Equestrian',
      'Shop Ariat bags in Australia, including large gear bags, rider luggage and equestrian travel essentials. Free shipping Australia-wide at The Equestrian.',
      '<p>Browse <strong>Ariat bags</strong> and rider luggage for training, shows and travel.</p>',
      '<h2>Ariat Luggage</h2><p>Placeholder; run scripts/run-page-seo-update for full copy.</p><ul><li>Gear bags</li><li>Boot and helmet organisers</li><li>Durable materials</li><li>Australia-wide delivery</li></ul>',
      'Ariat',
      ${PARENT},
      3,
      'published',
      'best-selling',
      '[]'::jsonb,
      '[]'::jsonb,
      'manual'
    )
    ON CONFLICT (url_path) DO UPDATE SET
      parent_url = EXCLUDED.parent_url,
      category_level = EXCLUDED.category_level,
      breadcrumb_label = EXCLUDED.breadcrumb_label,
      status = 'published',
      updated_at = NOW()
    RETURNING id, url_path
  `;
  console.log('collection_content:', content[0]);

  for (const productType of MAPPING_TYPES) {
    const row = await sql`
      INSERT INTO collection_mapping (
        top_level, parent_category, subcategory_handle, product_type, action
      ) VALUES (
        'rider', 'luggage', 'ariat', ${productType}, 'include'
      )
      ON CONFLICT (top_level, parent_category, subcategory_handle, product_type)
      DO UPDATE SET action = 'include', updated_at = NOW()
      RETURNING id, product_type
    `;
    console.log('collection_mapping:', row[0]);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
