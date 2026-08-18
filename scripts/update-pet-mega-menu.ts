#!/usr/bin/env tsx
/**
 * Upsert Pet mega menu: 2 L2 quick links + 6 published L3 cards.
 *   npx tsx scripts/update-pet-mega-menu.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });

const FLORAL_WIND_POOLER = 'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

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

const QUICK_LINKS = [
  {
    title: 'Dogs',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/NewIronbarkdogrug.jpg?v=1783318908',
    link: '/pet/dog',
  },
  {
    title: 'Cats',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/20397302_1.jpg?v=1746461085',
    link: '/pet/cat',
  },
];

const CARDS = [
  {
    title: 'Dog Grooming',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/SPAFUSION-SHAM_CON-BOTTLE_500ml_2.png?v=1787038286',
    link: '/pet/dog/grooming',
  },
  {
    title: 'Dog Food',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/pfa-kangaroo-dog-food.jpg?v=1787038287',
    link: '/pet/dog/food',
  },
  {
    title: 'Dog Treats',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/Pet-Food-AUS-Packaging-CHICKEN-JERKY-1000x1000-1.png?v=1787038286',
    link: '/pet/dog/treats',
  },
  {
    title: 'Collars & Leads',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/Brass_Clincher_Dog_Collar_Lead_Set_2.png?v=1785900751',
    link: '/pet/dog/collars-and-leads',
  },
  {
    title: 'Dog Coats',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/Kentuckydograincoat.png?v=1783317864',
    link: '/pet/dog/coats-and-rugs',
  },
  {
    title: 'Cat Food',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/img-prod-cat-dry-main_71ba9bfa-9f4c-4c9d-a2ac-d49172a1f819.png?v=1787038286',
    link: '/pet/cat/food',
  },
];

async function main(): Promise<void> {
  const sql = neon(resolveConnectionString());
  const result = await sql`
    INSERT INTO mega_menu_content (
      category, featured_image_url, featured_title, featured_subtitle, featured_link,
      quick_links, subcategory_cards
    ) VALUES (
      'pet',
      '/mega-menu/pet.png',
      'Pets',
      'The best for your pet!',
      '/pet',
      ${JSON.stringify(QUICK_LINKS)}::jsonb,
      ${JSON.stringify(CARDS)}::jsonb
    )
    ON CONFLICT (category) DO UPDATE SET
      featured_image_url = EXCLUDED.featured_image_url,
      featured_title = EXCLUDED.featured_title,
      featured_subtitle = EXCLUDED.featured_subtitle,
      featured_link = EXCLUDED.featured_link,
      quick_links = EXCLUDED.quick_links,
      subcategory_cards = EXCLUDED.subcategory_cards,
      updated_at = NOW()
    RETURNING category, jsonb_array_length(quick_links) AS quick, jsonb_array_length(subcategory_cards) AS cards
  `;
  console.log('Updated', result[0]);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
