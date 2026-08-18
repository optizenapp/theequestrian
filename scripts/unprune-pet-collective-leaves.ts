#!/usr/bin/env tsx
/**
 * Drop stale category-leaf-prune 301s for republished Pet Collective leaves.
 *   npx tsx scripts/unprune-pet-collective-leaves.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });

const FLORAL_WIND_POOLER = 'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

const PATHS = [
  '/pet/cat',
  '/pet/cat/food',
  '/pet/dog/grooming',
  '/pet/dog/food',
  '/pet/dog/treats',
];

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

async function main(): Promise<void> {
  const sql = neon(resolveConnectionString());
  const rows = await sql`
    UPDATE manual_redirects
    SET status = 'inactive', updated_at = NOW()
    WHERE from_path = ANY(${PATHS})
      AND status IN ('active', 'override')
    RETURNING from_path, to_path, source
  `;
  console.log(`Deactivated ${rows.length} prune redirects`);
  for (const row of rows as Array<{ from_path: string; to_path: string; source: string }>) {
    console.log(`  ${row.from_path} → ${row.to_path} (${row.source})`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
