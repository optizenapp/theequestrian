/**
 * Run article migrations via psql (so every statement runs; Neon HTTP driver runs only the first).
 * Run once to create article tables on jono-dev, then use npm run db:test-article-connection to verify.
 *
 * Requires: psql installed (e.g. brew install libpq or Postgres app)
 * Run: npx tsx scripts/run-article-migrations-psql.ts
 * Or:   USE_UNPOOLED=1 npx tsx scripts/run-article-migrations-psql.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const PROJECT_ROOT = resolve(process.cwd());
const EXPORT_MIGRATIONS = join(PROJECT_ROOT, 'docs', 'article-system-export', 'migrations');
const LOCAL_MIGRATIONS = join(PROJECT_ROOT, 'lib', 'db', 'schema', 'article-migrations');

function getOrderedMigrations(): { name: string; path: string }[] {
  const list: { name: string; path: string }[] = [];
  const m030 = join(LOCAL_MIGRATIONS, '030_place_and_entity.sql');
  if (existsSync(m030)) list.push({ name: '030_place_and_entity.sql', path: m030 });
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
  const m046 = join(LOCAL_MIGRATIONS, '046_copiq_social_pr.sql');
  if (existsSync(m046)) list.push({ name: '046_copiq_social_pr.sql', path: m046 });
  const m047 = join(LOCAL_MIGRATIONS, '047_seed_uncategorized.sql');
  if (existsSync(m047)) list.push({ name: '047_seed_uncategorized.sql', path: m047 });
  const m1004 = join(EXPORT_MIGRATIONS, '1004_add_pr_contacts_to_article.sql');
  if (existsSync(m1004)) list.push({ name: '1004_add_pr_contacts_to_article.sql', path: m1004 });
  return list;
}

function main() {
  const useUnpooled = process.env.USE_UNPOOLED === '1' || process.env.USE_UNPOOLED === 'true';
  const url = useUnpooled
    ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    : process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!url) {
    console.error('Set DATABASE_URL or POSTGRES_URL in .env.local');
    process.exit(1);
  }

  try {
    execSync('which psql', { stdio: 'pipe' });
  } catch {
    console.error('psql not found. Install with: brew install libpq && brew link --force libpq');
    process.exit(1);
  }

  const migrations = getOrderedMigrations();
  console.log('Running article migrations via psql...\n');

  for (const { name, path } of migrations) {
    process.stdout.write(`Running ${name}... `);
    try {
      if (name === '1004_add_pr_contacts_to_article.sql') {
        execSync(
          `psql "${url}" -c "ALTER TABLE public.article ADD COLUMN IF NOT EXISTS pr_contacts JSONB;" -c "COMMENT ON COLUMN public.article.pr_contacts IS 'PR contact emails and notification status';"`,
          { stdio: 'pipe' }
        );
      } else {
        execSync(`psql "${url}" -f "${path}"`, { stdio: 'pipe' });
      }
      console.log('✓');
    } catch (e) {
      console.log('FAILED');
      const err = e as { status?: number; stderr?: Buffer; stdout?: Buffer };
      if (err.stderr) process.stderr.write(err.stderr);
      if (err.stdout) process.stdout.write(err.stdout);
      process.exit(1);
    }
  }

  console.log('\nDone. Run: npm run db:test-article-connection');
}

main();
