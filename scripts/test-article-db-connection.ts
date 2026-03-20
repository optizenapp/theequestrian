/**
 * Test DB connection and visibility of article tables.
 * Run: npx tsx scripts/test-article-db-connection.ts
 *
 * Optional: USE_UNPOOLED=1 to test with DATABASE_URL_UNPOOLED
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { neon } from '@neondatabase/serverless';

async function main() {
  const useUnpooled = process.env.USE_UNPOOLED === '1' || process.env.USE_UNPOOLED === 'true';
  const url = useUnpooled
    ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    : process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;

  if (!url) {
    console.error('No DATABASE_URL or POSTGRES_URL found in env.');
    process.exit(1);
  }

  const label = useUnpooled ? 'unpooled' : 'pooler';
  const masked = url.replace(/:([^:@]+)@/, ':***@');
  console.log(`\nTesting connection (${label})...`);
  console.log('URL:', masked);
  console.log('');

  const sql = neon(url);

  try {
    // 1. Basic connectivity
    const timeResult = await sql`SELECT NOW() as now`;
    const now = Array.isArray(timeResult) ? timeResult[0] : null;
    console.log('1. SELECT NOW():', (now as { now: Date })?.now ?? timeResult);

    // 2. Current search_path
    const pathResult = await sql`SHOW search_path`;
    const path = Array.isArray(pathResult) ? pathResult[0] : null;
    console.log('2. search_path:', (path as { search_path: string })?.search_path ?? pathResult);

    // 3. List tables in public schema
    const tablesResult = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('public', 'pg_catalog')
        AND table_name IN ('article', 'article_category', 'place', 'entity')
      ORDER BY table_schema, table_name
    `;
    const tables = Array.isArray(tablesResult) ? tablesResult : [];
    console.log('3. Article-related tables in public/pg_catalog:', tables.length ? tables : '(none)');
    if (tables.length > 0) {
      tables.forEach((t: { table_schema: string; table_name: string }) =>
        console.log(`   - ${t.table_schema}.${t.table_name}`)
      );
    }

    // 4. If article_category exists, count rows
    const hasCategory = tables.some(
      (t: { table_schema: string; table_name: string }) =>
        t.table_schema === 'public' && t.table_name === 'article_category'
    );
    if (hasCategory) {
      const countResult = await sql`SELECT COUNT(*)::int AS n FROM public.article_category`;
      const n = Array.isArray(countResult) ? (countResult[0] as { n: number }).n : 0;
      console.log('4. public.article_category row count:', n);
    } else {
      console.log('4. public.article_category: table not found, skipping count');
    }

    console.log('\n✅ Connection OK\n');
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  }
}

main();
