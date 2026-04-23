import { sql } from '@/lib/db/client';

/**
 * Adds the `quick_answer` column to `brand_content` if it doesn't exist.
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
    } catch (err) {
      console.warn('[ensureBrandContentColumns] could not add columns:', err);
    }
  })();
  return ensurePromise;
}
