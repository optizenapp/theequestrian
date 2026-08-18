#!/usr/bin/env tsx
/**
 * Publish pet Collective category leaves + collection_mapping for WA Dog / Pet food Australia.
 *   npx tsx scripts/publish-pet-collective-categories.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

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

type Leaf = {
  url_path: string;
  parent_url: string;
  level: number;
  breadcrumb: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  top: string;
  parent: string;
  sub: string;
  types: string[];
};

const LEAVES: Leaf[] = [
  {
    url_path: '/pet/cat',
    parent_url: '/pet',
    level: 2,
    breadcrumb: 'Cats',
    h1: 'Cat Products',
    meta_title: 'Cat Food, Toys & Care | The Equestrian',
    meta_description:
      'Shop cat food, litter, toys and care products in Australia at The Equestrian. Free shipping Australia-wide.',
    top: 'pet',
    parent: 'cat',
    sub: '',
    types: [],
  },
  {
    url_path: '/pet/dog/grooming',
    parent_url: '/pet/dog',
    level: 3,
    breadcrumb: 'Grooming',
    h1: 'Dog Grooming Supplies & Coat Care',
    meta_title: 'Dog Grooming Supplies Australia | Shampoo, Brushes & More | The Equestrian',
    meta_description:
      'Shop dog grooming supplies in Australia including shampoo, conditioner, brushes, combs, cologne and professional grooming tools. Free shipping at The Equestrian.',
    top: 'pet',
    parent: 'dog',
    sub: 'grooming',
    types: [
      'Shampoo',
      'Conditioner',
      'Conditioners',
      'Comb',
      'Brush',
      'Hair Spray',
      'Styling & Finishing',
      'Cologne',
      'Conditioning Spray',
      'Scissors',
      'Clippers',
      'De-Shed Spray',
      'face cleanser',
      'cleanser',
      'Fast Spray',
      'Grooming Aid',
      'Comb Attachment',
      'Parts',
      'Bottle',
      'Pump',
      'Maintenance',
      'Cleaner',
      'Healthcare',
      'cold',
    ],
  },
  {
    url_path: '/pet/dog/food',
    parent_url: '/pet/dog',
    level: 3,
    breadcrumb: 'Food',
    h1: 'Premium Dog Food & Nutrition',
    meta_title: 'Dog Food Australia | Premium Nutrition | The Equestrian',
    meta_description:
      'Shop premium dog food in Australia at The Equestrian. Browse dry, wet and specialty dog nutrition with Australia-wide shipping.',
    top: 'pet',
    parent: 'dog',
    sub: 'food',
    types: ['Dog Food'],
  },
  {
    url_path: '/pet/dog/treats',
    parent_url: '/pet/dog',
    level: 3,
    breadcrumb: 'Treats',
    h1: 'Natural Dog Treats & Training Rewards',
    meta_title: 'Dog Treats Australia | Natural & Training Rewards | The Equestrian',
    meta_description:
      'Shop dog treats in Australia including natural chews and training rewards. Free shipping Australia-wide at The Equestrian.',
    top: 'pet',
    parent: 'dog',
    sub: 'treats',
    types: ['Dog Treats'],
  },
  {
    url_path: '/pet/cat/food',
    parent_url: '/pet/cat',
    level: 3,
    breadcrumb: 'Food & Treats',
    h1: 'Cat Food & Treats',
    meta_title: 'Cat Food Australia | Premium Cat Nutrition | The Equestrian',
    meta_description:
      'Shop cat food and treats in Australia at The Equestrian. Quality nutrition for cats with Australia-wide shipping.',
    top: 'pet',
    parent: 'cat',
    sub: 'food',
    types: ['Cat Food'],
  },
];

async function main(): Promise<void> {
  const sql = neon(resolveConnectionString());
  if (process.argv.includes('--dry-run')) {
    console.log('[dry-run] Would publish', LEAVES.map((l) => l.url_path));
    return;
  }

  for (const leaf of LEAVES) {
    const row = await sql`
      INSERT INTO collection_content (
        url_path, h1_title, meta_title, meta_description,
        short_description, long_description, breadcrumb_label, parent_url,
        category_level, status, default_sort, faq_items, related_categories, generated_by
      ) VALUES (
        ${leaf.url_path},
        ${leaf.h1},
        ${leaf.meta_title},
        ${leaf.meta_description},
        ${`<p>Browse <strong>${leaf.breadcrumb}</strong> for dogs and cats at The Equestrian.</p>`},
        ${`<h2>${leaf.h1}</h2><p>Run scripts/run-page-seo-update.ts for full SEO copy.</p>`},
        ${leaf.breadcrumb},
        ${leaf.parent_url},
        ${leaf.level},
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
      RETURNING url_path, status
    `;
    console.log('published', row[0]);

    for (const productType of leaf.types) {
      const subHandle = leaf.sub || '';
      const mapRow = await sql`
        INSERT INTO collection_mapping (
          top_level, parent_category, subcategory_handle, product_type, action, notes
        ) VALUES (
          ${leaf.top},
          ${leaf.parent},
          ${subHandle},
          ${productType},
          'include',
          'Pet Collective WA Dog / Pet food Australia'
        )
        ON CONFLICT (top_level, parent_category, subcategory_handle, product_type)
        DO UPDATE SET action = 'include', notes = EXCLUDED.notes, updated_at = NOW()
        RETURNING id, product_type
      `;
      console.log('  mapping', mapRow[0]);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
