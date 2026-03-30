#!/usr/bin/env tsx
/**
 * Remove duplicate brand_content row for handle kentucky-horsewear (canonical URL is /brands/kentucky).
 *
 * Run: npx tsx scripts/delete-brand-content-kentucky-horsewear.ts [--floral-prod]
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

async function main() {
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  }
  const sql = neon(connectionString);
  const removed = await sql`
    DELETE FROM brand_content WHERE handle = ${'kentucky-horsewear'} RETURNING handle
  `;
  console.log(
    removed.length
      ? `Removed brand_content: ${(removed as { handle: string }[]).map((r) => r.handle).join(', ')}`
      : 'No row found for handle kentucky-horsewear (already removed or never inserted)'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
