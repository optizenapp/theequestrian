#!/usr/bin/env tsx
/**
 * Find the latest Toptac order and compare sold prices vs current Shopify / Collective retail.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { inferCollectiveRetail } from './lib/collective-retail';

type Money = { shopMoney: { amount: string; currencyCode?: string } };
type Line = {
  title: string;
  quantity: number;
  sku: string | null;
  vendor: string | null;
  originalUnitPriceSet: Money;
  variant: {
    id: string;
    sku: string | null;
    price: string;
    inventoryItem: { unitCost: { amount: string } | null } | null;
    product: { handle: string; vendor: string };
  } | null;
};
type Order = {
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: Money;
  lineItems: { edges: Array<{ node: Line }> };
};

async function main(): Promise<void> {
  const data = await shopifyAdminFetch<{ orders: { edges: Array<{ node: Order }> } }>({
    query: `query {
      orders(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            name createdAt displayFinancialStatus displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            lineItems(first: 50) {
              edges {
                node {
                  title quantity sku vendor
                  originalUnitPriceSet { shopMoney { amount } }
                  variant {
                    id sku price
                    inventoryItem { unitCost { amount } }
                    product { handle vendor }
                  }
                }
              }
            }
          }
        }
      }
    }`,
  });

  let found: { order: Order; items: Line[] } | null = null;
  for (const { node: o } of data.orders.edges) {
    const items = o.lineItems.edges
      .map((e) => e.node)
      .filter((li) => {
        const v = (li.vendor || li.variant?.product?.vendor || '').toLowerCase();
        return v.includes('toptac');
      });
    if (items.length) {
      found = { order: o, items };
      break;
    }
  }

  if (!found) {
    console.log('No Toptac order in last 100 orders');
    process.exit(1);
  }

  const o = found.order;
  console.log(`ORDER ${o.name}`);
  console.log(`createdAt ${o.createdAt}`);
  console.log(`status ${o.displayFinancialStatus} / ${o.displayFulfillmentStatus}`);
  console.log(`total ${o.totalPriceSet.shopMoney.amount} ${o.totalPriceSet.shopMoney.currencyCode}`);
  console.log('');

  let allOk = true;
  for (const li of found.items) {
    const sold = Number(li.originalUnitPriceSet.shopMoney.amount);
    const cur = li.variant ? Number(li.variant.price) : NaN;
    const costRaw = li.variant?.inventoryItem?.unitCost?.amount;
    const cost = costRaw != null ? Number(costRaw) : null;
    const retail = cost != null ? inferCollectiveRetail(cost, 10) : null;
    const ok = retail != null && Number.isFinite(cur) && Math.abs(cur - retail) <= 0.5;
    const orderBelowCost = cost != null && sold + 0.005 < cost;
    if (!ok) allOk = false;

    console.log(li.title);
    console.log(`  sku: ${li.sku || li.variant?.sku || '(none)'}  qty: ${li.quantity}`);
    console.log(`  handle: ${li.variant?.product?.handle || '(n/a)'}`);
    console.log(`  SOLD AT (order):      $${sold.toFixed(2)}`);
    console.log(`  CURRENT Shopify:      $${Number.isFinite(cur) ? cur.toFixed(2) : 'n/a'}`);
    console.log(`  Collective cost:      $${cost != null ? cost.toFixed(2) : 'n/a'}`);
    console.log(`  Inferred retail:      $${retail != null ? retail.toFixed(2) : 'n/a'}`);
    console.log(`  Current correct now:  ${ok ? 'YES' : 'NO'}`);
    console.log(`  Order was below cost: ${orderBelowCost ? 'YES' : 'no'}`);
    console.log('');
  }

  console.log(
    allOk
      ? 'VERDICT: current live prices match Collective retail'
      : 'VERDICT: still mismatched on live catalogue'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
