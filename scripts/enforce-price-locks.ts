#!/usr/bin/env tsx
/**
 * Run the price-lock watchdog against the live Shopify store.
 *
 * Usage:
 *   tsx scripts/enforce-price-locks.ts
 *
 * Behavior:
 *   - Reads every row in marketplace_price_locks.
 *   - Fetches each variant from Shopify.
 *   - If the live price (or compare_at_price) has drifted from the locked
 *     value, PUTs the locked values back via the Admin API.
 *
 * The same logic runs every 5 minutes via the
 * /api/cron/enforce-price-locks Vercel cron (see vercel.json).
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main(): Promise<void> {
  const { enforceAllPriceLocks } = await import('@/lib/inventory/price-locks/enforce');
  const result = await enforceAllPriceLocks();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('enforce-price-locks failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
