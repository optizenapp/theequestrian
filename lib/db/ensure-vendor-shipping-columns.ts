import { sql } from '@/lib/db/client';

let ensurePromise: Promise<void> | null = null;

/** Adds vendor_shipping_rates columns missing from older prod schemas. */
export function ensureVendorShippingColumns(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      await sql`ALTER TABLE vendor_shipping_rates ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10, 2)`;
    } catch (err) {
      console.warn('[ensureVendorShippingColumns] could not add columns:', err);
    }
  })();
  return ensurePromise;
}
