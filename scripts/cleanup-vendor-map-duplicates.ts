#!/usr/bin/env tsx
/**
 * Cleanup duplicate (many-to-one) vendor_inventory_map pollution.
 *
 * A marketplace variant should be mapped to exactly ONE vendor variant. When a
 * vendor uses a non-unique/placeholder SKU (e.g. Trailrace "SMC50"), the SKU
 * auto-mapper pile-ups many vendor variants onto a single marketplace variant,
 * which corrupts both price and inventory sync. This finds those pile-ups and
 * disables every active map row for the affected marketplace variants.
 *
 * Read-only by default; pass --apply to write (status -> 'disabled').
 *
 * Usage:
 *   npm run cleanup:vendor-map-dupes -- --vendor=trailrace          # dry-run
 *   npm run cleanup:vendor-map-dupes -- --vendor=trailrace --apply  # execute
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { sql } from '@/lib/db/client';

const VENDOR_ALIASES: Record<string, string> = {
  trailrace: 'trailrace.myshopify.com',
  ascot: 'ascot-saddlery-vic.myshopify.com',
};

interface Args {
  vendor?: string;
  apply: boolean;
  min: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false, min: 2 };
  for (const arg of argv) {
    const vendor = arg.match(/^--vendor=(.+)$/);
    const min = arg.match(/^--min=(\d+)$/);
    if (vendor) args.vendor = vendor[1].toLowerCase();
    if (min) args.min = parseInt(min[1], 10);
    if (arg === '--apply') args.apply = true;
  }
  return args;
}

interface PollutedVariant {
  marketplace_variant_id: string;
  marketplace_product_id: string;
  sku: string | null;
  vendor_count: number;
}

async function resolveConnectionId(vendor?: string): Promise<number | null> {
  if (!vendor) return null;
  const domain = VENDOR_ALIASES[vendor] ?? vendor;
  const rows = (await sql`
    SELECT id FROM vendor_shop_connections
    WHERE LOWER(TRIM(shop_domain)) = ${domain.toLowerCase()} AND is_active = true
    LIMIT 1
  `) as Array<{ id: number }>;
  if (rows.length === 0) throw new Error(`No active connection for vendor "${vendor}"`);
  return rows[0].id;
}

async function findPolluted(connectionId: number | null, min: number): Promise<PollutedVariant[]> {
  const rows = (await sql`
    SELECT marketplace_variant_id,
           MAX(marketplace_product_id) AS marketplace_product_id,
           MAX(sku) AS sku,
           COUNT(DISTINCT vendor_shopify_variant_id)::INT AS vendor_count
    FROM vendor_inventory_map
    WHERE status = 'active'
      AND (${connectionId}::INT IS NULL OR vendor_connection_id = ${connectionId}::INT)
    GROUP BY marketplace_variant_id
    HAVING COUNT(DISTINCT vendor_shopify_variant_id) >= ${min}
    ORDER BY COUNT(DISTINCT vendor_shopify_variant_id) DESC
  `) as PollutedVariant[];
  return rows;
}

async function main(): Promise<void> {
  const { vendor, apply, min } = parseArgs(process.argv.slice(2));
  const connectionId = await resolveConnectionId(vendor);

  const polluted = await findPolluted(connectionId, min);
  const totalRows = polluted.reduce((sum, p) => sum + p.vendor_count, 0);

  console.log(
    `Found ${polluted.length} marketplace variant(s) with >= ${min} vendor variants mapped ` +
      `(${totalRows} active map rows affected)${vendor ? ` for ${vendor}` : ''}.`
  );
  for (const p of polluted.slice(0, 15)) {
    console.log(
      `  variant ${p.marketplace_variant_id} (product ${p.marketplace_product_id}, sku ${p.sku ?? '-'}): ${p.vendor_count} vendor variants`
    );
  }
  if (polluted.length > 15) console.log(`  ... and ${polluted.length - 15} more`);

  if (polluted.length === 0) {
    console.log('Nothing to clean.');
    return;
  }

  if (!apply) {
    console.log('\nDRY RUN — no changes written. Re-run with --apply to disable these map rows.');
    return;
  }

  const result = (await sql`
    UPDATE vendor_inventory_map
    SET status = 'disabled', updated_at = NOW()
    WHERE status = 'active'
      AND (${connectionId}::INT IS NULL OR vendor_connection_id = ${connectionId}::INT)
      AND marketplace_variant_id IN (
        SELECT marketplace_variant_id
        FROM vendor_inventory_map
        WHERE status = 'active'
          AND (${connectionId}::INT IS NULL OR vendor_connection_id = ${connectionId}::INT)
        GROUP BY marketplace_variant_id
        HAVING COUNT(DISTINCT vendor_shopify_variant_id) >= ${min}
      )
    RETURNING id
  `) as Array<{ id: number }>;

  console.log(`\nAPPLIED — disabled ${result.length} polluted map row(s).`);
}

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
