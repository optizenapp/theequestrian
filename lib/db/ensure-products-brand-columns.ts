import { sql } from '@/lib/db/client';

/**
 * Adds the `brand` and `brand_hub_handle` columns to `products` if they don't exist.
 *
 * Safe to call from any read path: runs at most once per process and falls back
 * silently on permission errors so production reads never crash if the DB role
 * lacks DDL rights — instead, the caller will see the column-missing error from
 * its own SELECT and can degrade gracefully.
 */
let ensurePromise: Promise<void> | null = null;

export function ensureProductsBrandColumns(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_hub_handle TEXT`;
    } catch (err) {
      console.warn('[ensureProductsBrandColumns] could not add columns:', err);
    }
  })();
  return ensurePromise;
}
