import { calculateRewards } from './calculate';
import type { RewardsOrderSnapshot } from './order-source';
import { settleReturns } from './returns';
import type { RewardCalculation } from './types';

export type RewardOrderStatus = 'pending' | 'released' | 'void';

export type RewardOrderState = {
  status: RewardOrderStatus;
  awardCents: number;
};

const PAID_STATUSES = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

export function isPaidOrder(snapshot: RewardsOrderSnapshot): boolean {
  return snapshot.financialStatus !== null && PAID_STATUSES.has(snapshot.financialStatus);
}

/** Built once, at first payment, and persisted so later returns reuse the same allocations. */
export function buildOrderCalculation(
  snapshot: RewardsOrderSnapshot,
  rateBps: number
): RewardCalculation {
  return calculateRewards({
    lines: snapshot.lines.map((line) => ({
      lineId: line.lineId,
      quantity: line.quantity,
      netCents: line.netCents,
      eligible: !line.isGiftCard,
    })),
    requestedRedemptionCents: snapshot.storeCreditCents,
    rateBps,
  });
}

/**
 * Released only when every retained eligible unit has shipped; a partial shipment stays pending.
 * Release is one-way: later returns reduce the award but never move it back to pending.
 */
export function deriveOrderRewardState(
  snapshot: RewardsOrderSnapshot,
  original: RewardCalculation,
  previouslyReleased: boolean
): RewardOrderState {
  if (snapshot.cancelled || !isPaidOrder(snapshot)) {
    return { status: 'void', awardCents: 0 };
  }

  const settlement = settleReturns(
    original,
    snapshot.lines.map((line) => ({
      lineId: line.lineId,
      quantity: line.quantity - line.currentQuantity,
    }))
  );
  if (settlement.finalAwardCents === 0) {
    return { status: 'void', awardCents: 0 };
  }

  const allShipped = snapshot.lines.every(
    (line) => line.isGiftCard || Math.min(line.unfulfilledQuantity, line.currentQuantity) === 0
  );
  return {
    status: previouslyReleased || allShipped ? 'released' : 'pending',
    awardCents: settlement.finalAwardCents,
  };
}
