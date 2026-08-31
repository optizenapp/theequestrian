#!/usr/bin/env tsx
/**
 * Upsert Accessories mega menu: hub quick links + featured cards.
 *
 *   npx tsx scripts/update-accessories-mega-menu.ts --floral-prod
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
  { title: 'Homeware', imageUrl: '', link: '/accessories/homeware' },
  { title: 'Kitchen', imageUrl: '', link: '/accessories/kitchen' },
  { title: 'Cards', imageUrl: '', link: '/accessories/cards' },
  { title: 'Books', imageUrl: '', link: '/accessories/books' },
  { title: 'Gifts', imageUrl: '', link: '/accessories/gifts' },
];

const CARDS = [
  { title: 'Cushions', imageUrl: '', link: '/accessories/homeware/cushions' },
  { title: 'Mugs', imageUrl: '', link: '/accessories/kitchen/mugs' },
  { title: 'Glassware', imageUrl: '', link: '/accessories/kitchen/glassware' },
  { title: 'Trays', imageUrl: '', link: '/accessories/kitchen/trays' },
  { title: 'Greeting Cards', imageUrl: '', link: '/accessories/cards/greeting-cards' },
  { title: 'Gift Cards', imageUrl: '', link: '/accessories/gift-cards' },
];

async function main(): Promise<void> {
  const sql = neon(resolveConnectionString());
  const result = await sql`
    INSERT INTO mega_menu_content (
      category, featured_image_url, featured_title, featured_subtitle, featured_link,
      quick_links, subcategory_cards
    ) VALUES (
      'accessories',
      '/mega-menu/accessories.png',
      'Accessories',
      'Gifts, homeware, kitchen and cards',
      '/accessories',
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
