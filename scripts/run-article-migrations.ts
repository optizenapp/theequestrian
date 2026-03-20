/**
 * Run article system SQL migrations in order.
 * Uses Neon DB (lib/db/client). Run: npx tsx scripts/run-article-migrations.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { sql } from '@/lib/db/client';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const PROJECT_ROOT = resolve(process.cwd());
const EXPORT_MIGRATIONS = join(PROJECT_ROOT, 'docs', 'article-system-export', 'migrations');
const LOCAL_MIGRATIONS = join(PROJECT_ROOT, 'lib', 'db', 'schema', 'article-migrations');

function getOrderedMigrations(): { name: string; path: string }[] {
  const list: { name: string; path: string }[] = [];

  // 030 first (place + entity)
  const m030 = join(LOCAL_MIGRATIONS, '030_place_and_entity.sql');
  if (existsSync(m030)) list.push({ name: '030_place_and_entity.sql', path: m030 });

  // Export migrations 031 -> 045
  const exportOrder = [
    '031_article_system.sql',
    '033_article_editorial_control.sql',
    '034_increase_article_field_lengths.sql',
    '035_article_primary_category.sql',
    '045_add_copiq_integration.sql',
  ];
  for (const name of exportOrder) {
    const path = join(EXPORT_MIGRATIONS, name);
    if (existsSync(path)) list.push({ name, path });
  }

  // 046 (copiq_social_posts + pr_contacts)
  const m046 = join(LOCAL_MIGRATIONS, '046_copiq_social_pr.sql');
  if (existsSync(m046)) list.push({ name: '046_copiq_social_pr.sql', path: m046 });

  // 047 seed uncategorized
  const m047 = join(LOCAL_MIGRATIONS, '047_seed_uncategorized.sql');
  if (existsSync(m047)) list.push({ name: '047_seed_uncategorized.sql', path: m047 });

  // 1004 (pr_contacts only - we strip to ALTER only)
  const m1004 = join(EXPORT_MIGRATIONS, '1004_add_pr_contacts_to_article.sql');
  if (existsSync(m1004)) list.push({ name: '1004_add_pr_contacts_to_article.sql', path: m1004 });

  return list;
}

async function runMigration(name: string, path: string) {
  let fullSql = readFileSync(path, 'utf-8');
  if (name === '1004_add_pr_contacts_to_article.sql') {
    fullSql = `
      ALTER TABLE public.article ADD COLUMN IF NOT EXISTS pr_contacts JSONB;
      COMMENT ON COLUMN public.article.pr_contacts IS 'PR contact emails and notification status';
    `;
  }
  // Ensure we create in public schema
  const withSchema = `SET search_path = public;\n${fullSql}`;
  try {
    await sql.unsafe(withSchema);
  } catch (e) {
    console.error(`[run-article-migrations] Failed ${name}:`, e);
    throw e;
  }
  console.log(`  ✓ ${name}`);
}

/** Run all article migrations (idempotent). Export for use by migrate-shopify-articles-to-db. */
export async function runArticleMigrations(): Promise<void> {
  // Force public schema (Neon/pooler can use different search_path per request)
  await sql`SET search_path = public`;
  const migrations = getOrderedMigrations();
  for (const { name, path } of migrations) {
    console.log(`Running ${name}...`);
    await runMigration(name, path);
  }
}

async function main() {
  console.log('Running article system migrations...\n');
  await runArticleMigrations();
  console.log('\nDone.');
}

// Only run when executed directly (e.g. tsx scripts/run-article-migrations.ts), not when imported
const isEntry = require.main === module || process.argv[1]?.includes('run-article-migrations');
if (isEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
