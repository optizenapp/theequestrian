import { sql } from '@/lib/db/client';

const safeDecodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizePath = (value: string) => {
  if (!value) return '/';
  const trimmed = value.trim();
  const decoded = safeDecodePath(trimmed);
  let normalized = decoded;
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

const ensureRedirectTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS manual_redirects (
      id SERIAL PRIMARY KEY,
      from_path TEXT UNIQUE NOT NULL,
      to_path TEXT NOT NULL,
      redirect_type TEXT NOT NULL DEFAULT '301',
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'active',
      conflict_target TEXT,
      last_checked TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE manual_redirects ADD COLUMN IF NOT EXISTS redirect_type TEXT NOT NULL DEFAULT '301'`;
  await sql`ALTER TABLE manual_redirects ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`;
  await sql`ALTER TABLE manual_redirects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`;
  await sql`ALTER TABLE manual_redirects ADD COLUMN IF NOT EXISTS conflict_target TEXT`;
  await sql`ALTER TABLE manual_redirects ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ`;
  await sql`ALTER TABLE manual_redirects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
};

export async function getManualRedirect(pathname: string) {
  await ensureRedirectTable();
  const fromPath = normalizePath(pathname);
  const result = await sql`
    SELECT to_path, redirect_type
    FROM manual_redirects
    WHERE from_path = ${fromPath}
      AND status IN ('active', 'override')
    LIMIT 1
  `;
  const row = (Array.isArray(result) ? result[0] : undefined) as { to_path: string; redirect_type: string } | undefined;
  if (!row) return null;
  return {
    to: row.to_path,
    type: row.redirect_type || '301',
  };
}

export async function createManualRedirect(
  from: string,
  to: string,
  redirectType = '301',
  source = 'manual'
) {
  await ensureRedirectTable();
  const fromPath = normalizePath(from);
  const toPath = normalizePath(to);
  const type = redirectType || '301';
  const sourceValue = source || 'manual';
  await sql`
    INSERT INTO manual_redirects (from_path, to_path, redirect_type, source)
    VALUES (${fromPath}, ${toPath}, ${type}, ${sourceValue})
    ON CONFLICT (from_path) DO UPDATE
    SET to_path = EXCLUDED.to_path,
        redirect_type = EXCLUDED.redirect_type,
        status = 'active',
        conflict_target = NULL,
        updated_at = NOW()
  `;
  return { from: fromPath, to: toPath, type, source: sourceValue };
}

export async function listManualRedirects(limit = 50, source?: string) {
  await ensureRedirectTable();
  const result = source
    ? await sql`
        SELECT id, from_path, to_path, redirect_type, source, status, conflict_target, last_checked, created_at, updated_at
        FROM manual_redirects
        WHERE source = ${source}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, from_path, to_path, redirect_type, source, status, conflict_target, last_checked, created_at, updated_at
        FROM manual_redirects
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
  return Array.isArray(result) ? result : [];
}
