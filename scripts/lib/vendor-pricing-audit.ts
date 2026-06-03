/**
 * Orchestrates a single vendor's pricing audit: bulk-fetch prices, join against
 * vendor_inventory_map, classify drift, and render summary/CSV. Read-only.
 */

import * as fs from 'fs';
import * as path from 'path';
import { sql } from '@/lib/db/client';
import { resolveShippingOffset, type ShippingRates } from '@/lib/shipping/rates';
import {
  fetchAllVariants,
  fetchVariantsByIds,
  fetchVariantsByProductIds,
  type VariantRecord,
} from './vendor-pricing-fetch';
import {
  buildDiffs,
  classifyRow,
  expectedFromVendor,
  rowsToCsv,
  type AuditRow,
} from './vendor-pricing-core';

export interface VendorConnection {
  id: number;
  shop_domain: string;
  marketplace_vendor_name: string;
  access_token: string;
}

interface MappingRow {
  sku: string | null;
  vendor_shopify_variant_id: string;
  marketplace_product_id: string;
  marketplace_variant_id: string;
}

export async function auditConnection(
  connection: VendorConnection,
  rates: ShippingRates,
  lockedVariants: Set<string>,
  limit?: number
): Promise<AuditRow[]> {
  console.log(`\n=== ${connection.marketplace_vendor_name} (${connection.shop_domain})`);

  const marketDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const marketToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!marketDomain || !marketToken) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
  }

  const allMaps = (await sql`
    SELECT sku, vendor_shopify_variant_id, marketplace_product_id, marketplace_variant_id
    FROM vendor_inventory_map
    WHERE vendor_connection_id = ${connection.id}
      AND status = 'active'
    ORDER BY sku NULLS LAST, marketplace_variant_id
  `) as MappingRow[];
  const maps = limit && limit > 0 ? allMaps.slice(0, limit) : allMaps;
  console.log(`    ${maps.length} active mappings${limit ? ` (limited from ${allMaps.length})` : ''}`);

  let vendorVariants: Map<string, VariantRecord>;
  let marketVariants: Map<string, VariantRecord>;
  if (limit && limit > 0) {
    console.log('  Fetching targeted vendor + marketplace variants (limited spot check)...');
    vendorVariants = await fetchVariantsByIds(
      connection.shop_domain,
      connection.access_token,
      maps.map((m) => m.vendor_shopify_variant_id)
    );
    marketVariants = await fetchVariantsByProductIds(
      marketDomain,
      marketToken,
      maps.map((m) => m.marketplace_product_id)
    );
  } else {
    console.log('  Fetching vendor store variants...');
    vendorVariants = await fetchAllVariants(connection.shop_domain, connection.access_token);
    console.log(`    ${vendorVariants.size} vendor variants`);
    console.log('  Fetching marketplace variants...');
    marketVariants = await fetchAllVariants(marketDomain, marketToken, connection.marketplace_vendor_name);
  }
  console.log(`    ${vendorVariants.size} vendor / ${marketVariants.size} marketplace variants loaded`);

  const rows: AuditRow[] = [];
  for (const map of maps) {
    const vendor = vendorVariants.get(map.vendor_shopify_variant_id);
    const market = marketVariants.get(map.marketplace_variant_id);
    const locked = lockedVariants.has(map.marketplace_variant_id);
    const sku = map.sku ?? vendor?.sku ?? market?.sku ?? '';

    if (!vendor || vendor.price == null) {
      rows.push(emptyRow(connection, map, sku, market, locked, 'MISSING_VENDOR_VARIANT'));
      continue;
    }
    if (!market) {
      rows.push(emptyRow(connection, map, sku, undefined, locked, 'MISSING_MARKETPLACE_VARIANT', vendor.price, vendor.compareAt));
      continue;
    }

    const { shippingOffset } = resolveShippingOffset(
      connection.marketplace_vendor_name,
      market.tags,
      rates,
      undefined,
      vendor.price
    );
    const offset = shippingOffset ?? 0;
    const { expectedPrice, expectedCompareAt } = expectedFromVendor(vendor.price, vendor.compareAt, offset);
    const { priceDiff, compareDiff } = buildDiffs({
      actualPrice: market.price,
      expectedPrice,
      actualCompareAt: market.compareAt,
      expectedCompareAt,
    });

    rows.push({
      vendor: connection.marketplace_vendor_name,
      sku,
      marketplaceProductId: map.marketplace_product_id,
      marketplaceVariantId: map.marketplace_variant_id,
      marketplaceStatus: market.status,
      vendorPrice: vendor.price,
      offset,
      expectedPrice,
      actualPrice: market.price,
      priceDiff,
      vendorCompareAt: vendor.compareAt,
      expectedCompareAt,
      actualCompareAt: market.compareAt,
      compareDiff,
      locked,
      flag: classifyRow(priceDiff, compareDiff, locked),
    });
  }

  return rows;
}

function emptyRow(
  connection: VendorConnection,
  map: MappingRow,
  sku: string,
  market: { status: string; price: number | null; compareAt: number | null } | undefined,
  locked: boolean,
  flag: AuditRow['flag'],
  vendorPrice: number | null = null,
  vendorCompareAt: number | null = null
): AuditRow {
  return {
    vendor: connection.marketplace_vendor_name,
    sku,
    marketplaceProductId: map.marketplace_product_id,
    marketplaceVariantId: map.marketplace_variant_id,
    marketplaceStatus: market?.status ?? '',
    vendorPrice,
    offset: 0,
    expectedPrice: null,
    actualPrice: market?.price ?? null,
    priceDiff: null,
    vendorCompareAt,
    expectedCompareAt: null,
    actualCompareAt: market?.compareAt ?? null,
    compareDiff: null,
    locked,
    flag,
  };
}

export function printSummary(vendorName: string, rows: AuditRow[]): void {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.flag, (counts.get(r.flag) ?? 0) + 1);
  console.log(`  Summary for ${vendorName}: ${rows.length} mapped variants`);
  for (const [flag, n] of [...counts.entries()].sort()) console.log(`    ${flag}: ${n}`);

  const drifts = rows
    .filter((r) => r.priceDiff != null && Math.abs(r.priceDiff) >= 0.01)
    .sort((a, b) => Math.abs(b.priceDiff ?? 0) - Math.abs(a.priceDiff ?? 0))
    .slice(0, 10);
  if (drifts.length > 0) {
    console.log('  Top price drifts (actual - expected):');
    for (const r of drifts) {
      console.log(`    ${r.sku || r.marketplaceVariantId}: expected $${r.expectedPrice} actual $${r.actualPrice} (diff $${r.priceDiff})`);
    }
  }
}

export function writeCsv(vendorSlug: string, rows: AuditRow[]): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(process.cwd(), 'exports', `vendor-pricing-audit-${vendorSlug}-${stamp}.csv`);
  fs.writeFileSync(outPath, rowsToCsv(rows), 'utf-8');
  return outPath;
}
