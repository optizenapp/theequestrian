import type { RewardOrderState } from './order-state';

export type RewardBucket = 'pending' | 'available';

export type PlannedMovement = {
  operationKey: string;
  bucket: RewardBucket;
  type: 'earn' | 'adjust' | 'release';
  amountCents: number;
};

export type BucketTotals = {
  pending: number;
  available: number;
  hasMovements: boolean;
};

/**
 * Plans the movements that bring an order's recorded buckets to the desired state.
 * Keys are derived from the target state, so replays and concurrent runs collide
 * on the unique operation key instead of double-posting.
 */
export function planRewardMovements(
  orderId: string,
  current: BucketTotals,
  desired: RewardOrderState
): PlannedMovement[] {
  const movements: PlannedMovement[] = [];
  let pending = current.pending;
  let available = current.available;

  if (!current.hasMovements && desired.awardCents > 0) {
    movements.push({ operationKey: `order:${orderId}:earn`, bucket: 'pending', type: 'earn', amountCents: desired.awardCents });
    pending = desired.awardCents;
  }

  if (desired.status === 'released' && pending > 0) {
    movements.push(
      { operationKey: `order:${orderId}:release:pending`, bucket: 'pending', type: 'release', amountCents: -pending },
      { operationKey: `order:${orderId}:release:available`, bucket: 'available', type: 'release', amountCents: pending }
    );
    available += pending;
    pending = 0;
  }

  const target: Record<RewardBucket, number> =
    desired.status === 'released'
      ? { pending: 0, available: desired.awardCents }
      : { pending: desired.awardCents, available: 0 };

  for (const [bucket, now] of [['pending', pending], ['available', available]] as const) {
    const delta = target[bucket] - now;
    if (delta !== 0) {
      movements.push({
        operationKey: `order:${orderId}:adjust:${bucket}:${target[bucket]}`,
        bucket,
        type: 'adjust',
        amountCents: delta,
      });
    }
  }
  return movements;
}
