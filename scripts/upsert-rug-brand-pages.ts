#!/usr/bin/env tsx
/**
 * Upsert brand_content for Zilco, Shanga, Wild Horse (horse rug brand hub links).
 * Kentucky uses the existing /brands/kentucky page — not included here.
 * Appears on /brands index. /brands/[handle] still requires matching Shopify collection handle.
 *
 * rules: null (category sidebar uses vendor/tag when set; refine in Admin after you confirm product tags/vendors).
 *
 * Run: npx tsx scripts/upsert-rug-brand-pages.ts [--floral-prod]
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) {
    return process.env.CUSTOM_DATABASE_URL;
  }
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) {
      throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    }
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
}

const BRANDS: Array<{
  handle: string;
  title: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
}> = [
  {
    handle: 'zilco',
    title: 'Zilco',
    h1_title: 'Zilco Horse Rugs & Gear',
    meta_title: 'Zilco | Horse Rugs & Equestrian Gear | The Equestrian',
    meta_description:
      'Shop Zilco horse rugs, combos and equestrian gear. Trusted Australian quality with fast delivery.',
    short_description: 'Browse Zilco rugs and turnout gear built for durability and fit.',
    long_description:
      '<h2>Zilco at The Equestrian</h2><p>Shop Zilco horse rugs and related gear from a brand known for practical, hard-wearing designs.</p>',
    breadcrumb_label: 'Zilco',
  },
  {
    handle: 'shanga',
    title: 'Shanga',
    h1_title: 'Shanga Horse Rugs',
    meta_title: 'Shanga | Horse Rugs & Combos | The Equestrian',
    meta_description:
      'Shop Shanga horse rugs and combos. Value-focused designs for everyday turnout and stable use.',
    short_description: 'Shanga rugs and combos for practical everyday horse care.',
    long_description:
      '<h2>Shanga</h2><p>Browse Shanga horse rugs known for reliable everyday performance.</p>',
    breadcrumb_label: 'Shanga',
  },
  {
    handle: 'wild-horse',
    title: 'Wild Horse',
    h1_title: 'Wild Horse Rugs',
    meta_title: 'Wild Horse | Horse Rugs | The Equestrian',
    meta_description:
      'Shop Wild Horse rugs and combos. Durable designs for Australian conditions.',
    short_description: 'Wild Horse turnout and stable rugs built for tough use.',
    long_description:
      '<h2>Wild Horse</h2><p>Explore Wild Horse rugs designed for durability and comfort.</p>',
    breadcrumb_label: 'Wild Horse',
  },
];

async function main() {
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  }
  const sql = neon(connectionString);

  for (const b of BRANDS) {
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
        status
      ) VALUES (
        ${b.handle},
        ${b.title},
        0,
        NULL,
        ${b.h1_title},
        ${b.meta_title},
        ${b.meta_description},
        ${b.short_description},
        ${b.long_description},
        ${b.breadcrumb_label},
        '[]',
        'published'
      )
      ON CONFLICT (handle) DO UPDATE SET
        title = EXCLUDED.title,
        h1_title = EXCLUDED.h1_title,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        short_description = EXCLUDED.short_description,
        long_description = EXCLUDED.long_description,
        breadcrumb_label = EXCLUDED.breadcrumb_label,
        status = EXCLUDED.status,
        updated_at = NOW()
    `;
    console.log('Upserted brand_content:', b.handle);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
