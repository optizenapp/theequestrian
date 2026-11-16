import { sql } from '@/lib/db/vercel-postgres';

let ensurePromise: Promise<void> | null = null;

export function ensureCartUpsellOffersTable(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS cart_upsell_offers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          priority INTEGER NOT NULL DEFAULT 100,
          headline TEXT NOT NULL DEFAULT 'Complete your order',
          trigger_type TEXT NOT NULL CHECK (trigger_type IN ('product_handle', 'product_type', 'vendor')),
          trigger_values TEXT[] NOT NULL DEFAULT '{}',
          candidate_handles TEXT[] NOT NULL DEFAULT '{}',
          max_products INTEGER NOT NULL DEFAULT 3 CHECK (max_products BETWEEN 1 AND 6),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_cart_upsell_offers_enabled_priority
          ON cart_upsell_offers (enabled, priority ASC)
      `;
    } catch (err) {
      console.warn('[ensureCartUpsellOffersTable] failed:', err);
      ensurePromise = null;
      throw err;
    }
  })();
  return ensurePromise;
}