#!/usr/bin/env tsx
/**
 * One-off GA4 purchase backfill from Shopify orders.
 *
 * Usage:
 *   tsx scripts/backfill-ga4-purchases.ts --start=2026-02-10 --end=2026-02-13
 *   tsx scripts/backfill-ga4-purchases.ts --start=2026-02-10 --end=2026-02-13 --apply
 *   tsx scripts/backfill-ga4-purchases.ts --start=2026-02-10 --end=2026-02-13 --apply --sync
 *
 * Notes:
 * - Default mode is dry-run (no DB writes).
 * - --apply inserts missing orders into ga4_purchase_events.
 * - --sync runs GA4 Measurement Protocol sync after inserts.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/vercel-postgres';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { syncQueuedGa4PurchaseEvents } from '@/lib/analytics/ga4-sync';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type ShopifyOrderNode = {
  id: string;
  legacyResourceId: string;
  name: string;
  createdAt: string;
  email: string | null;
  customer?: { email?: string | null } | null;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        product?: { legacyResourceId?: string | null } | null;
        originalUnitPriceSet?: {
          shopMoney?: {
            amount?: string;
          } | null;
        } | null;
      };
    }>;
  };
};

const ORDER_BACKFILL_QUERY = `
  query OrdersForGa4Backfill($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          legacyResourceId
          name
          createdAt
          email
          customer {
            email
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          lineItems(first: 100) {
            edges {
              node {
                title
                quantity
                product {
                  legacyResourceId
                }
                originalUnitPriceSet {
                  shopMoney {
                    amount
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

function getArgValue(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.slice(flag.length + 1);
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function normalizeIsoDateBoundary(dateStr: string, endOfDay: boolean): string {
  const suffix = endOfDay ? 'T23:59:59Z' : 'T00:00:00Z';
  return `${dateStr}${suffix}`;
}

async function fetchOrders(startDate: string, endDate: string) {
  const startIso = normalizeIsoDateBoundary(startDate, false);
  const endIso = normalizeIsoDateBoundary(endDate, true);
  const queryString = `created_at:>=${startIso} created_at:<=${endIso}`;

  const collected: ShopifyOrderNode[] = [];
  let after: string | null = null;
  let page = 0;

  while (true) {
    page += 1;
    const data = await shopifyAdminFetch<{
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: ShopifyOrderNode }>;
      };
    }>({
      query: ORDER_BACKFILL_QUERY,
      variables: {
        first: 100,
        after,
        query: queryString,
      },
    });

    const edges = data.orders.edges || [];
    collected.push(...edges.map((edge) => edge.node));
    console.log(`📦 Fetched page ${page}: ${edges.length} orders`);

    if (!data.orders.pageInfo.hasNextPage) break;
    after = data.orders.pageInfo.endCursor;
    if (!after) break;
  }

  return collected;
}

function toGaItems(order: ShopifyOrderNode) {
  return (order.lineItems?.edges || []).map((edge) => {
    const item = edge.node;
    return {
      item_id: item.product?.legacyResourceId?.toString?.() || undefined,
      item_name: item.title,
      quantity: item.quantity,
      price: Number(item.originalUnitPriceSet?.shopMoney?.amount || '0'),
    };
  });
}

function normalizeOrderNumber(order: ShopifyOrderNode): string {
  const fromName = (order.name || '').replace('#', '').trim();
  if (fromName) return fromName;
  return order.legacyResourceId?.toString?.() || '';
}

async function main() {
  const start = getArgValue('--start');
  const end = getArgValue('--end');
  const apply = hasFlag('--apply');
  const sync = hasFlag('--sync');

  if (!start || !end) {
    console.error('❌ Missing required args --start=YYYY-MM-DD and --end=YYYY-MM-DD');
    process.exit(1);
  }

  console.log('🚀 GA4 purchase backfill');
  console.log(`   Range: ${start} -> ${end}`);
  console.log(`   Mode: ${apply ? 'APPLY (write)' : 'DRY RUN'}`);
  console.log(`   Sync: ${sync ? 'yes' : 'no'}`);

  const orders = await fetchOrders(start, end);
  console.log(`\n📊 Total Shopify orders fetched: ${orders.length}`);

  let eligible = 0;
  let inserted = 0;
  let alreadyQueued = 0;
  let skipped = 0;

  for (const order of orders) {
    const orderId = order.legacyResourceId?.toString?.();
    const orderNumber = normalizeOrderNumber(order);
    const customerEmail = (order.email || order.customer?.email || '').trim();
    const items = toGaItems(order);

    if (!orderId || !orderNumber || !customerEmail || items.length === 0) {
      skipped += 1;
      continue;
    }

    eligible += 1;

    if (!apply) {
      continue;
    }

    const insertResult = await sql`
      INSERT INTO ga4_purchase_events (
        order_id,
        order_number,
        customer_email,
        total_amount,
        currency,
        items,
        created_at
      ) VALUES (
        ${orderId},
        ${orderNumber},
        ${customerEmail},
        ${Number(order.totalPriceSet.shopMoney.amount || '0')},
        ${order.totalPriceSet.shopMoney.currencyCode || 'AUD'},
        ${JSON.stringify(items)},
        ${order.createdAt}
      )
      ON CONFLICT (order_id) DO NOTHING
      RETURNING id
    `;

    if (insertResult.rows.length > 0) {
      inserted += 1;
    } else {
      alreadyQueued += 1;
    }
  }

  console.log('\n✅ Backfill summary');
  console.log(`   Eligible orders: ${eligible}`);
  console.log(`   Skipped (missing data): ${skipped}`);
  if (apply) {
    console.log(`   Inserted into queue: ${inserted}`);
    console.log(`   Already queued: ${alreadyQueued}`);
  } else {
    console.log('   Dry run only (no rows inserted)');
    console.log('   Re-run with --apply to insert missing rows');
  }

  if (apply && sync) {
    console.log('\n📡 Syncing queued events to GA4...');
    const syncResult = await syncQueuedGa4PurchaseEvents(500);
    console.log('✅ Sync result:', syncResult);
  }
}

main().catch((error) => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});

