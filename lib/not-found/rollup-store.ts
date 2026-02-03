import { sql } from '@vercel/postgres';
import { suggestRedirectForPath } from '@/lib/not-found/suggestions';

export type NotFoundSource = 'internal' | 'ga4' | 'scan';
export type RollupStatus = 'pending' | 'auto_applied' | 'manual' | 'ignored';

const ignorePrefixes = ['/admin'];
const ignoreExact = new Set(['/']);

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

const shouldIgnorePath = (value: string) => {
  if (ignoreExact.has(value)) return true;
  return ignorePrefixes.some((prefix) => value.startsWith(prefix));
};

export const ensureNotFoundRollupTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS not_found_rollup (
      path TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'internal',
      hit_count INTEGER NOT NULL DEFAULT 0,
      ga4_views INTEGER NOT NULL DEFAULT 0,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      latest_referrer TEXT,
      suggested_to TEXT,
      suggested_type TEXT,
      confidence NUMERIC,
      suggested_reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal'`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS hit_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS ga4_views INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS latest_referrer TEXT`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS suggested_to TEXT`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS suggested_type TEXT`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS confidence NUMERIC`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS suggested_reason TEXT`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`;
  await sql`ALTER TABLE not_found_rollup ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
};

export async function markRollupStatus(path: string, status: RollupStatus) {
  await ensureNotFoundRollupTable();
  const normalized = normalizePath(path);
  await sql`
    UPDATE not_found_rollup
    SET status = ${status},
        updated_at = NOW()
    WHERE path = ${normalized}
  `;
}

export async function upsertNotFoundRollup(params: {
  path: string;
  referrer?: string | null;
  source: NotFoundSource;
  hitIncrement?: number;
  ga4Views?: number | null;
  forceSuggest?: boolean;
}) {
  const {
    path,
    referrer = null,
    source,
    hitIncrement = 1,
    ga4Views = null,
    forceSuggest = false,
  } = params;
  const normalized = normalizePath(path);
  await ensureNotFoundRollupTable();

  const statusOverride: RollupStatus | null = shouldIgnorePath(normalized) ? 'ignored' : null;
  const result = await sql`
    INSERT INTO not_found_rollup (
      path,
      source,
      hit_count,
      ga4_views,
      first_seen,
      last_seen,
      latest_referrer,
      status,
      updated_at
    )
    VALUES (
      ${normalized},
      ${source},
      ${hitIncrement},
      ${ga4Views ?? 0},
      NOW(),
      NOW(),
      ${referrer},
      ${statusOverride ?? 'pending'},
      NOW()
    )
    ON CONFLICT (path) DO UPDATE
    SET last_seen = NOW(),
        hit_count = not_found_rollup.hit_count + ${hitIncrement},
        ga4_views = CASE
          WHEN ${ga4Views}::int IS NULL THEN not_found_rollup.ga4_views
          ELSE GREATEST(not_found_rollup.ga4_views, ${ga4Views})
        END,
        latest_referrer = COALESCE(${referrer}, not_found_rollup.latest_referrer),
        source = CASE
          WHEN not_found_rollup.source = ${source} THEN not_found_rollup.source
          WHEN not_found_rollup.source = 'mixed' THEN 'mixed'
          ELSE 'mixed'
        END,
        status = CASE
          WHEN not_found_rollup.status = 'manual' THEN 'manual'
          WHEN ${statusOverride}::text IS NULL THEN not_found_rollup.status
          ELSE ${statusOverride}
        END,
        updated_at = NOW()
    RETURNING suggested_to, status
  `;

  const row = result.rows[0];
  if (!row || row.status === 'ignored') {
    return;
  }

  if (row.suggested_to && row.suggested_to.startsWith('/products/')) {
    await sql`
      UPDATE not_found_rollup
      SET suggested_to = NULL,
          suggested_type = NULL,
          confidence = NULL,
          suggested_reason = NULL,
          status = 'pending',
          updated_at = NOW()
      WHERE path = ${normalized}
    `;
    row.suggested_to = null;
  }

  if (!row.suggested_to || forceSuggest) {
    const suggestion = await suggestRedirectForPath(normalized);
    if (!suggestion) {
      return;
    }
    if (suggestion.to === normalized) {
      return;
    }
    await sql`
      UPDATE not_found_rollup
      SET suggested_to = ${suggestion.to},
          suggested_type = ${suggestion.type},
          confidence = ${suggestion.confidence},
          suggested_reason = ${suggestion.reason},
          status = ${suggestion.status ?? 'pending'},
          updated_at = NOW()
      WHERE path = ${normalized}
        AND suggested_to IS NULL
    `;
  }
}

export async function recomputeRollupSuggestions(limit = 500) {
  await ensureNotFoundRollupTable();
  const rows = await sql`
    SELECT path, status
    FROM not_found_rollup
    WHERE status != 'ignored'
      AND status != 'manual'
    ORDER BY last_seen DESC
    LIMIT ${limit}
  `;

  let updated = 0;
  for (const row of rows.rows) {
    const path = row.path as string;
    const suggestion = await suggestRedirectForPath(path);
    if (!suggestion) {
      await sql`
        UPDATE not_found_rollup
        SET suggested_to = NULL,
            suggested_type = NULL,
            confidence = NULL,
            suggested_reason = NULL,
            status = 'pending',
            updated_at = NOW()
        WHERE path = ${path}
      `;
      updated += 1;
      continue;
    }

    if (suggestion.to === path || suggestion.to.startsWith('/products/')) {
      await sql`
        UPDATE not_found_rollup
        SET suggested_to = NULL,
            suggested_type = NULL,
            confidence = NULL,
            suggested_reason = NULL,
            status = 'pending',
            updated_at = NOW()
        WHERE path = ${path}
      `;
      updated += 1;
      continue;
    }

    await sql`
      UPDATE not_found_rollup
      SET suggested_to = ${suggestion.to},
          suggested_type = ${suggestion.type},
          confidence = ${suggestion.confidence},
          suggested_reason = ${suggestion.reason},
          status = ${suggestion.status ?? 'pending'},
          updated_at = NOW()
      WHERE path = ${path}
    `;
    updated += 1;
  }

  return { updated, total: rows.rows.length };
}
