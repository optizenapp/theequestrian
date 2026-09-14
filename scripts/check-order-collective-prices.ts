#!/usr/bin/env tsx
/**
 * Check order #N line items: sold price vs live Shopify vs inferred Collective retail.
 * Usage: npx tsx scripts/check-order-collective-prices.ts --order=3841
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getArg } from './lib/migration-cli';
import { inferCollectiveRetail, KNOWN_COLLECTIVE_MARGINS } from './lib/collective-retail';

type Money = { shopMoney: { amount: string; currencyCode?: string } };
type Line = {
  title: string;
  quantity: number;
  sku: string | null;
  vendor: string | null;
  originalUnitPriceSet: Money;
  discountedUnitPriceSet: Money;
  variant: {
    id: string;
    sku: string | null;
    price: string;
    inventoryItem: { unitCost: { amount: string } | null } | null;
    product: { handle: string; vendor: string; tags: string[]; status: string };
  } | null;
};

async function main(): Promise<void> {
  const orderNum = getArg('--order') || '3841';
  const data = await shopifyAdminFetch<{
    orders: {
      edges: Array<{
        node: {
          name: string;
          createdAt: string;
          displayFinancialStatus: string;
          displayFulfillmentStatus: string;
          totalPriceSet: Money;
          lineItems: { edges: Array<{ node: Line }> };
        };
      }>;
    };
  }>({
    query: `query($q: String!) {
      orders(first: 5, query: $q) {
        edges {
          node {
            name createdAt displayFinancialStatus displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            lineItems(first: 50) {
              edges {
                node {
                  title quantity sku vendor
                  originalUnitPriceSet { shopMoney { amount } }
                  discountedUnitPriceSet { shopMoney { amount } }
                  variant {
                    id sku price
                    inventoryItem { unitCost { amount } }
                    product { handle vendor tags status }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    variables: { q: `name:#${orderNum}` },
  });

  const order = data.orders.edges[0]?.node;
  if (!order) {
    console.log(`Order #${orderNum} not found`);
    process.exit(1);
  }

  console.log(`ORDER ${order.name}`);
  console.log(`createdAt ${order.createdAt}`);
  console.log(`status ${order.displayFinancialStatus} / ${order.displayFulfillmentStatus}`);
  console.log(`total ${order.totalPriceSet.shopMoney.amount} ${order.totalPriceSet.shopMoney.currencyCode}`);
  console.log('');

  let anyStillBroken = false;
  let anyWasMismatch = false;

  for (const { node: li } of order.lineItems.edges) {
    const sold = Number(li.originalUnitPriceSet.shopMoney.amount);
    const cur = li.variant ? Number(li.variant.price) : NaN;
    const costRaw = li.variant?.inventoryItem?.unitCost?.amount;
    const cost = costRaw != null ? Number(costRaw) : null;
    const vendor = li.vendor || li.variant?.product?.vendor || '';
    const margin = KNOWN_COLLECTIVE_MARGINS[vendor.toLowerCase()] ?? 10;
    const retail = cost != null && cost > 0 ? inferCollectiveRetail(cost, margin) : null;

    const orderBelowCost = cost != null && sold + 0.005 < cost;
    const orderUnderRetail = retail != null && sold + 0.5 < retail;
    const liveOk =
      retail != null && Number.isFinite(cur) && Math.abs(cur - retail) <= 0.5 && cur + 0.005 >= (cost || 0);
    const liveBelowCost = cost != null && Number.isFinite(cur) && cur + 0.005 < cost;
    const liveUnderRetail = retail != null && Number.isFinite(cur) && cur + 0.5 < retail;

    if (orderBelowCost || orderUnderRetail) anyWasMismatch = true;
    if (!liveOk || liveBelowCost || liveUnderRetail) anyStillBroken = true;

    console.log(li.title);
    console.log(`  vendor: ${vendor}  sku: ${li.sku || li.variant?.sku || '(none)'}  qty: ${li.quantity}`);
    console.log(`  handle: ${li.variant?.product?.handle || '(n/a)'}  status: ${li.variant?.product?.status || '?'}`);
    console.log(`  SOLD AT (order):       $${sold.toFixed(2)}`);
    console.log(`  CURRENT Shopify:       $${Number.isFinite(cur) ? cur.toFixed(2) : 'n/a'}`);
    console.log(`  Collective cost:       $${cost != null ? cost.toFixed(2) : 'n/a'}`);
    console.log(`  Inferred retail (~${margin}%): $${retail != null ? retail.toFixed(2) : 'n/a'}`);
    console.log(`  Order was mismatch:    ${orderBelowCost || orderUnderRetail ? 'YES' : 'no'}${orderBelowCost ? ' (below cost)' : orderUnderRetail ? ' (under retail)' : ''}`);
    console.log(`  Live price fixed now:  ${liveOk && !liveBelowCost && !liveUnderRetail ? 'YES' : 'NO'}`);
    if (liveBelowCost) console.log(`  !! LIVE STILL BELOW COST`);
    if (liveUnderRetail) console.log(`  !! LIVE STILL UNDER RETAIL (Δ $${(cur - (retail || 0)).toFixed(2)})`);
    console.log('');
  }

  console.log('---');
  console.log(`Order had price mismatch: ${anyWasMismatch ? 'YES' : 'no'}`);
  console.log(
    anyStillBroken
      ? 'VERDICT: LIVE CATALOGUE STILL NOT FIXED for these SKUs'
      : 'VERDICT: live catalogue prices now match Collective retail'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
