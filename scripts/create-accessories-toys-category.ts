#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) {
      throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    }
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL in .env.local');
  return cs;
}

async function main() {
  const sql = neon(resolveConnectionString());

  const result = await sql`
    INSERT INTO collection_content (
      url_path,
      h1_title,
      meta_title,
      meta_description,
      short_description,
      long_description,
      breadcrumb_label,
      parent_url,
      category_level,
      status,
      default_sort,
      faq_items,
      related_categories,
      generated_by
    ) VALUES (
      '/accessories/toys',
      'Horse Figurines, Model Horses & Collectible Toys',
      'Horse Figurines & Model Horse Toys | The Equestrian',
      'Shop horse figurines, model horses and collectible toys at The Equestrian.',
      'Discover horse figurines, model horses and collectible toys for horse lovers of all ages.',
      '<h2>Horse Figurines & Collectible Toys</h2><p>Browse our range of horse figurines, model horses and collectible toys.</p>',
      'Toys',
      '/accessories',
      2,
      'published',
      'best-selling',
      '[]'::jsonb,
      '[]'::jsonb,
      'manual'
    )
    ON CONFLICT (url_path) DO UPDATE SET
      breadcrumb_label = EXCLUDED.breadcrumb_label,
      parent_url = EXCLUDED.parent_url,
      category_level = EXCLUDED.category_level,
      status = 'published',
      updated_at = NOW()
    RETURNING id, url_path, breadcrumb_label, parent_url, category_level, status
  `;

  console.log('Upserted:', result[0]);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
