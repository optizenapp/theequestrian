import { sql } from '@vercel/postgres';
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
  const manualRows = await sql`
    SELECT from_path
    FROM manual_redirects
  `;

  const manualTotal = manualRows.rows.length;
  let manualPlus = 0;
  for (const row of manualRows.rows) {
    const path = normalizePath(row.from_path as string);
    if (hasPlusInPath(path)) {
      manualPlus += 1;
    }
  }

  const rollupRows = await sql`
    SELECT path
    FROM not_found_rollup
  `;
  const rollupTotal = rollupRows.rows.length;
  let rollupPlus = 0;
  for (const row of rollupRows.rows) {
    const path = normalizePath(row.path as string);
    if (hasPlusInPath(path)) {
      rollupPlus += 1;
    }
  }

  console.log(`✅ Unified redirects total: ${manualTotal}`);
  console.log(`✅ Unified redirects with '+' anywhere in path: ${manualPlus}`);
  console.log(`✅ Not found rollup total: ${rollupTotal}`);
  console.log(`✅ Not found rollup with '+' anywhere in path: ${rollupPlus}`);
}

run().catch((error) => {
  console.error('❌ Failed to count + redirects:', error);
  process.exit(1);
});
