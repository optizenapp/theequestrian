import { shopifyFetch } from '@/lib/shopify/client';
import { calculateRewards } from './calculate';
import { allocateCents, toCents } from './money';
import type { RewardLineInput } from './types';

type Money = { amount: string; currencyCode: string };

type RewardsCartResponse = {
  cart: {
    id: string;
    discountAllocations: Array<{ discountedAmount: Money; targetType: string }>;
    lines: {
      pageInfo: { hasNextPage: boolean };
      nodes: Array<{
        id: string;
        quantity: number;
        cost: { totalAmount: Money };
        merchandise: { product?: { isGiftCard: boolean } };
      }>;
    };
  } | null;
};

export type CartRewardsEstimate = {
  awardCents: number;
  eligibleCents: number;
  rateBps: number;
};

const REWARDS_CART_QUERY = `
  query RewardsCart($cartId: ID!) {
    cart(id: $cartId) {
      id
      discountAllocations { discountedAmount { amount currencyCode } targetType }
      lines(first: 100) {
        pageInfo { hasNextPage }
        nodes {
          id
          quantity
          cost { totalAmount { amount currencyCode } }
          merchandise { ... on ProductVariant { product { isGiftCard } } }
        }
      }
    }
  }
`;

/**
 * Line totals already include line-level discounts; cart-level product discounts are
 * spread across eligible lines so the estimate matches what settlement will see.
 */
export async function estimateCartRewards(cartId: string, rateBps: number): Promise<CartRewardsEstimate | null> {
  const data = await shopifyFetch<RewardsCartResponse>({
    query: REWARDS_CART_QUERY,
    variables: { cartId },
    cache: 'no-store',
  });
  const cart = data.cart;
  if (!cart || cart.lines.pageInfo.hasNextPage) return null;

  const lines: RewardLineInput[] = cart.lines.nodes
    .filter((line) => line.cost.totalAmount.currencyCode === 'AUD')
    .map((line) => ({
      lineId: line.id,
      quantity: line.quantity,
      netCents: toCents(line.cost.totalAmount.amount),
      eligible: line.merchandise.product?.isGiftCard !== true,
    }));
  if (lines.length !== cart.lines.nodes.length) return null;

  const cartDiscountCents = cart.discountAllocations
    .filter((allocation) => allocation.targetType === 'LINE_ITEM')
    .reduce((sum, allocation) => sum + toCents(allocation.discountedAmount.amount), 0);
  const weights = lines.map((line) => (line.eligible ? line.netCents : 0));
  const eligibleTotal = weights.reduce((sum, cents) => sum + cents, 0);
  const discountByLine = allocateCents(Math.min(cartDiscountCents, eligibleTotal), weights);

  const result = calculateRewards({
    lines: lines.map((line, index) => ({ ...line, netCents: line.netCents - discountByLine[index] })),
    requestedRedemptionCents: 0,
    rateBps,
  });
  return { awardCents: result.awardCents, eligibleCents: result.eligibleCents, rateBps };
}
