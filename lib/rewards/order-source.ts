import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { toCents } from './money';

export type RewardsOrderLine = {
  lineId: string;
  quantity: number;
  currentQuantity: number;
  unfulfilledQuantity: number;
  isGiftCard: boolean;
  netCents: number;
};

export type RewardsOrderSnapshot = {
  orderId: string;
  name: string;
  createdAt: Date;
  cancelled: boolean;
  test: boolean;
  currency: string;
  financialStatus: string | null;
  customerId: string | null;
  /** Paid with store credit (i.e. rewards); that portion earns no further rewards. */
  storeCreditCents: number;
  lines: RewardsOrderLine[];
};

const STORE_CREDIT_GATEWAY = /store[\s_-]?credit/i;

type MoneyAmount = { shopMoney: { amount: string } };

type OrderResponse = {
  order: {
    id: string;
    name: string;
    createdAt: string;
    cancelledAt: string | null;
    test: boolean;
    currencyCode: string;
    displayFinancialStatus: string | null;
    customer: { id: string } | null;
    transactions: Array<{ kind: string; status: string; gateway: string | null; amountSet: MoneyAmount }>;
    lineItems: {
      pageInfo: { hasNextPage: boolean };
      nodes: Array<{
        id: string;
        quantity: number;
        currentQuantity: number;
        unfulfilledQuantity: number;
        isGiftCard: boolean;
        originalTotalSet: MoneyAmount;
        discountAllocations: Array<{ allocatedAmountSet: MoneyAmount }>;
      }>;
    };
  } | null;
};

const REWARDS_ORDER_QUERY = `
  query RewardsOrder($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      cancelledAt
      test
      currencyCode
      displayFinancialStatus
      customer { id }
      transactions(first: 50) { kind status gateway amountSet { shopMoney { amount } } }
      lineItems(first: 250) {
        pageInfo { hasNextPage }
        nodes {
          id
          quantity
          currentQuantity
          unfulfilledQuantity
          isGiftCard
          originalTotalSet { shopMoney { amount } }
          discountAllocations { allocatedAmountSet { shopMoney { amount } } }
        }
      }
    }
  }
`;

/** Re-reads canonical order state from Shopify; webhook payloads are only a trigger. */
export async function fetchRewardsOrder(orderGid: string): Promise<RewardsOrderSnapshot | null> {
  const data = await shopifyAdminFetch<OrderResponse>({
    query: REWARDS_ORDER_QUERY,
    variables: { id: orderGid },
  });
  const order = data.order;
  if (!order) return null;
  if (order.lineItems.pageInfo.hasNextPage) {
    throw new Error(`Order ${order.id} has more than 250 line items; rewards need manual review`);
  }

  return {
    orderId: order.id,
    name: order.name,
    createdAt: new Date(order.createdAt),
    cancelled: order.cancelledAt !== null,
    test: order.test,
    currency: order.currencyCode,
    financialStatus: order.displayFinancialStatus,
    customerId: order.customer?.id ?? null,
    storeCreditCents: order.transactions
      .filter((t) => (t.kind === 'SALE' || t.kind === 'CAPTURE') && t.status === 'SUCCESS' && STORE_CREDIT_GATEWAY.test(t.gateway ?? ''))
      .reduce((sum, t) => sum + toCents(t.amountSet.shopMoney.amount), 0),
    lines: order.lineItems.nodes.map((line) => {
      const discountCents = line.discountAllocations.reduce(
        (sum, allocation) => sum + toCents(allocation.allocatedAmountSet.shopMoney.amount),
        0
      );
      return {
        lineId: line.id,
        quantity: line.quantity,
        currentQuantity: line.currentQuantity,
        unfulfilledQuantity: line.unfulfilledQuantity,
        isGiftCard: line.isGiftCard,
        netCents: Math.max(0, toCents(line.originalTotalSet.shopMoney.amount) - discountCents),
      };
    }),
  };
}
