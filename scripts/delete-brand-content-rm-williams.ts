#!/usr/bin/env tsx
/**
 * Remove blocked RM Williams brand_content rows.
 *
 * Run: npx tsx scripts/delete-brand-content-rm-williams.ts [--floral-prod]
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { getBlockedBrandHandles } from '@/lib/brands/blocked-brands';

const FLORAL_WIND_POOLER = 'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
}

async function main() {
  const connectionString = resolveConnectionString();
  if (!connectionString) throw new Error('Missing POSTGRES_URL or DATABASE_URL');

  const sql = neon(connectionString);
  const handles = getBlockedBrandHandles();
  const removed = await sql`
    DELETE FROM brand_content
    WHERE handle = ANY(${handles})
    RETURNING handle
  `;

  const removedHandles = (removed as { handle: string }[]).map((row) => row.handle);
  console.log(
    removedHandles.length
      ? `Removed brand_content: ${removedHandles.join(', ')}`
      : `No blocked brand rows found (${handles.join(', ')})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
