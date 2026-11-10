import { sql } from '@/lib/db/vercel-postgres';

let ensurePromise: Promise<void> | null = null;

/** Adds rewards_settings columns introduced after the initial rewards.sql was applied. */
export function ensureRewardsColumns(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      await sql`ALTER TABLE rewards_settings ADD COLUMN IF NOT EXISTS estimate_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
    } catch (err) {
      console.warn('[ensureRewardsColumns] could not add columns:', err);
      ensurePromise = null;
    }
  })();
  return ensurePromise;
}
