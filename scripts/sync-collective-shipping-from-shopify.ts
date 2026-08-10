/**
 * Sync Standard AU shipping rates from Shopify Collective Carrier Service
 * into collective_shipping_rates (via draftOrderCalculate).
 *
 * Usage:
 *   npx tsx scripts/sync-collective-shipping-from-shopify.ts --limit=50
 *   npx tsx scripts/sync-collective-shipping-from-shopify.ts --vendor=Trailrace
 *   npx tsx scripts/sync-collective-shipping-from-shopify.ts --stale-hours=24
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { sql } from '@/lib/db/client';
import { ensureCollectiveShippingRatesTable } from '@/lib/db/collective-shipping-rates';
import {
  fetchAndCacheCollectiveRate,
  sleep,
} from '@/lib/shipping/collective-rates';

function getArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function listStaleVariantIds(staleHours: number): Promise<Set<string>> {
  await ensureCollectiveShippingRatesTable();
  const rows = (await sql`
    SELECT variant_id
    FROM collective_shipping_rates
    WHERE fetched_at > NOW() - (${staleHours} || ' hours')::interval
  `) as Array<{ variant_id: string }>;
  return new Set(rows.map((row) => row.variant_id));
}

async function main() {
  const vendorFilter = getArg('--vendor');
  const limit = Number(getArg('--limit') || '0') || 0;
  const delayMs = Number(getArg('--delay-ms') || '350') || 350;
  const staleHours = Number(getArg('--stale-hours') || '0') || 0;
  const dryRun = hasFlag('--dry-run');

  const fresh = staleHours > 0 ? await listStaleVariantIds(staleHours) : new Set<string>();
  const queryParts = ['status:active'];
  if (vendorFilter) queryParts.push(`vendor:"${vendorFilter}"`);
  const searchQuery = queryParts.join(' ');

  let cursor: string | null = null;
  let hasNext = true;
  let scanned = 0;
  let synced = 0;
  let skippedFresh = 0;
  let errors = 0;

  console.log(`[collective-shipping] query=${searchQuery} limit=${limit || 'none'} delayMs=${delayMs}`);

  while (hasNext) {
    const page = await shopifyAdminFetch<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            vendor: string;
            variants: {
              edges: Array<{ node: { id: string; price: string } }>;
            };
          };
        }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: `#graphql
        query($q: String!, $first: Int!, $after: String) {
          products(first: $first, after: $after, query: $q) {
            edges {
              node {
                id
                handle
                vendor
                variants(first: 1) {
                  edges { node { id price } }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `,
      variables: { q: searchQuery, first: 50, after: cursor },
    });

    for (const { node } of page.products.edges) {
      const variant = node.variants.edges[0]?.node;
      if (!variant) continue;
      scanned += 1;

      const variantNumeric = variant.id.split('/').pop() || variant.id;
      if (fresh.has(variantNumeric)) {
        skippedFresh += 1;
        continue;
      }

      if (dryRun) {
        console.log(`[dry-run] ${node.vendor}\t${node.handle}\t${variant.price}`);
        synced += 1;
      } else {
        try {
          const quote = await fetchAndCacheCollectiveRate({
            productId: node.id,
            variantId: variant.id,
            vendor: node.vendor,
            handle: node.handle,
            samplePriceAud: Number(variant.price),
          });
          console.log(
            `${node.vendor}\t${node.handle}\tprice=${variant.price}\tstandard=${quote.standard?.amount ?? 'null'}`
          );
          synced += 1;
          await sleep(delayMs);
        } catch (error) {
          errors += 1;
          console.error(
            `[error] ${node.handle}:`,
            error instanceof Error ? error.message : error
          );
          await sleep(delayMs * 2);
        }
      }

      if (limit > 0 && synced >= limit) {
        hasNext = false;
        break;
      }
    }

    if (!hasNext) break;
    hasNext = page.products.pageInfo.hasNextPage;
    cursor = page.products.pageInfo.endCursor;
  }

  console.log(
    JSON.stringify({ scanned, synced, skippedFresh, errors, dryRun }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
