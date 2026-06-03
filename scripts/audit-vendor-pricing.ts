#!/usr/bin/env tsx
/**
 * Vendor Pricing Audit (read-only)
 *
 * Compares each Trailrace / Ascot marketplace variant's price and
 * compare_at_price against the expected value derived from the live vendor
 * price plus the configured shipping offset, and reports drift to console + CSV.
 *
 * Rules use the live `vendor_shipping_rates` config via resolveShippingOffset:
 *   Trailrace = vendor + $0; Ascot = vendor + $12 (#HEAVY -> +$15).
 *
 * Usage:
 *   npm run audit:vendor-pricing
 *   npm run audit:vendor-pricing -- --vendor=ascot --limit=50
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { loadShippingRates } from '@/lib/shipping/rates';
import { sql } from '@/lib/db/client';
import {
  auditConnection,
  printSummary,
  writeCsv,
  type VendorConnection,
} from './lib/vendor-pricing-audit';

const VENDOR_ALIASES: Record<string, string> = {
  trailrace: 'trailrace.myshopify.com',
  ascot: 'ascot-saddlery-vic.myshopify.com',
};

function parseArgs(argv: string[]): { vendor?: string; limit?: number } {
  const args: { vendor?: string; limit?: number } = {};
  for (const arg of argv) {
    const vendorMatch = arg.match(/^--vendor=(.+)$/);
    const limitMatch = arg.match(/^--limit=(\d+)$/);
    if (vendorMatch) args.vendor = vendorMatch[1].toLowerCase();
    if (limitMatch) args.limit = parseInt(limitMatch[1], 10);
  }
  return args;
}

async function getConnections(vendorFilter?: string): Promise<VendorConnection[]> {
  const rows = (await sql`
    SELECT id, shop_domain, marketplace_vendor_name, access_token
    FROM vendor_shop_connections
    WHERE is_active = true AND sync_price = true
    ORDER BY id
  `) as VendorConnection[];

  if (!vendorFilter) return rows;
  const wantedDomain = VENDOR_ALIASES[vendorFilter] ?? vendorFilter;
  return rows.filter(
    (r) => r.shop_domain.toLowerCase() === wantedDomain.toLowerCase()
  );
}

async function getLockedVariants(): Promise<Set<string>> {
  try {
    const rows = (await sql`SELECT variant_id FROM marketplace_price_locks`) as Array<{ variant_id: string }>;
    return new Set(rows.map((r) => String(r.variant_id)));
  } catch {
    return new Set();
  }
}

async function main(): Promise<void> {
  const { vendor, limit } = parseArgs(process.argv.slice(2));

  const connections = await getConnections(vendor);
  if (connections.length === 0) {
    console.error(`No active price-sync vendor connection matched${vendor ? ` "${vendor}"` : ''}.`);
    process.exit(1);
  }

  const rates = await loadShippingRates();
  const lockedVariants = await getLockedVariants();
  console.log(`Loaded shipping rates and ${lockedVariants.size} price lock(s).`);

  for (const connection of connections) {
    const rows = await auditConnection(connection, rates, lockedVariants, limit);
    printSummary(connection.marketplace_vendor_name, rows);
    const slug = connection.shop_domain.split('.')[0];
    const outPath = writeCsv(slug, rows);
    console.log(`  CSV: ${outPath}`);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
