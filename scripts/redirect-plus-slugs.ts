import { sql } from '@/lib/db/vercel-postgres';
import { createManualRedirect } from '@/lib/redirects/manual';
import 'dotenv/config';

const loadEnv = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: '.env.local' });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: '.env' });
  } catch {
    // no-op
  }
};

const hasPlusInPath = (pathname: string) => {
  const withoutQuery = pathname.split('?')[0].split('#')[0];
  return withoutQuery.includes('+');
};

const normalizePath = (value: string) => {
  if (!value) return '/';
  const trimmed = value.trim();
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  if (!withoutQuery.startsWith('/')) return `/${withoutQuery}`;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
};

async function run() {
  loadEnv();

  const normalizedPlusRows = await sql`
    SELECT path
    FROM not_found_rollup
    WHERE path LIKE '%+%'
  `;

  const plusPaths = normalizedPlusRows.rows
    .map((row) => normalizePath(row.path as string))
    .filter((path) => hasPlusInPath(path));

  if (plusPaths.length === 0) {
    console.log('✅ No "+" paths found to backfill.');
    return;
  }

  await sql`
    INSERT INTO manual_redirects (from_path, to_path, redirect_type, source)
    SELECT path, '/', '301', 'auto_plus'
    FROM not_found_rollup
    WHERE path = ANY(${plusPaths})
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = EXCLUDED.redirect_type,
        status = 'active',
        conflict_target = NULL,
        updated_at = NOW()
  `;

  const { rowCount } = await sql`
    UPDATE not_found_rollup
    SET suggested_to = '/',
        suggested_type = '301',
        confidence = 1,
        suggested_reason = 'auto_plus',
        status = 'auto_applied',
        updated_at = NOW()
    WHERE path = ANY(${plusPaths})
  `;

  console.log(`✅ Added/updated ${plusPaths.length} '+' redirects to manual_redirects`);
  console.log(`✅ Marked ${rowCount} rollup rows as auto_applied`);
}

run().catch((error) => {
  console.error('❌ Failed to backfill + redirects:', error);
  process.exit(1);
});
