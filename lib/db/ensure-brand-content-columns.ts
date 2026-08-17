import { sql } from '@/lib/db/client';

/**
 * Adds optional columns to `brand_content` if they don't exist.
 *
 * Same pattern as ensureProductsBrandColumns: runs at most once per process,
 * falls back silently on permission errors.
 */
let ensurePromise: Promise<void> | null = null;

export function ensureBrandContentColumns(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS quick_answer TEXT`;
      await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS logo_url TEXT`;
      await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_html TEXT`;
      await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_source_url TEXT`;
      await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_updated_at TIMESTAMPTZ`;
    } catch (err) {
      console.warn('[ensureBrandContentColumns] could not add columns:', err);
    }
  })();
  return ensurePromise;
}
