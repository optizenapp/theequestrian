import { sql } from '@/lib/db/vercel-postgres';
import type { RewardOrderState } from './order-state';
import type { RewardsOrderSnapshot } from './order-source';
import type { BucketTotals, PlannedMovement } from './plan-movements';
import type { RewardCalculation } from './types';

export type StoredRewardOrder = {
  status: RewardOrderState['status'];
  calculation: RewardCalculation;
};

export async function getStoredRewardOrder(orderId: string): Promise<StoredRewardOrder | null> {
  const result = await sql<{ status: StoredRewardOrder['status']; calculation: RewardCalculation }>`
    SELECT status, calculation FROM rewards_orders WHERE order_id = ${orderId}
  `;
  return result.rows[0] ?? null;
}

export async function getBucketTotals(orderId: string): Promise<BucketTotals> {
  const result = await sql<{ pending: string; available: string; movement_count: string }>`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE bucket = 'pending'), 0) AS pending,
      COALESCE(SUM(amount_cents) FILTER (WHERE bucket = 'available'), 0) AS available,
      COUNT(*) AS movement_count
    FROM rewards_movements WHERE order_id = ${orderId}
  `;
  const row = result.rows[0];
  return {
    pending: Number(row?.pending ?? 0),
    available: Number(row?.available ?? 0),
    hasMovements: Number(row?.movement_count ?? 0) > 0,
  };
}

/** The calculation and rate are written once; later reconciles only move status and award. */
export async function upsertRewardOrder(
  snapshot: RewardsOrderSnapshot,
  calculation: RewardCalculation,
  state: RewardOrderState
): Promise<void> {
  const releasedAt = state.status === 'released' ? new Date().toISOString() : null;
  await sql`
    INSERT INTO rewards_orders (
      order_id, order_name, customer_id, currency, rate_bps, calculation,
      original_award_cents, current_award_cents, status, order_created_at, released_at
    ) VALUES (
      ${snapshot.orderId}, ${snapshot.name}, ${snapshot.customerId}, ${snapshot.currency},
      ${calculation.rateBps}, ${JSON.stringify(calculation)}, ${calculation.awardCents},
      ${state.awardCents}, ${state.status}, ${snapshot.createdAt.toISOString()}, ${releasedAt}
    )
    ON CONFLICT (order_id) DO UPDATE SET
      customer_id = COALESCE(EXCLUDED.customer_id, rewards_orders.customer_id),
      current_award_cents = EXCLUDED.current_award_cents,
      status = EXCLUDED.status,
      released_at = COALESCE(rewards_orders.released_at, EXCLUDED.released_at),
      last_reconciled_at = NOW()
  `;
}

/** One multi-row statement, so a release pair lands together or not at all. */
export async function insertMovements(
  snapshot: RewardsOrderSnapshot,
  movements: PlannedMovement[]
): Promise<number> {
  if (movements.length === 0) return 0;
  const params: Array<string | number | null> = [];
  const values = movements.map((movement) => {
    const base = params.length;
    params.push(
      movement.operationKey,
      snapshot.orderId,
      snapshot.customerId,
      movement.bucket,
      movement.type,
      movement.amountCents,
      snapshot.currency
    );
    return `(${Array.from({ length: 7 }, (_, i) => `$${base + i + 1}`).join(', ')})`;
  });
  const result = await sql.query(
    `INSERT INTO rewards_movements
       (operation_key, order_id, customer_id, bucket, type, amount_cents, currency)
     VALUES ${values.join(', ')}
     ON CONFLICT (operation_key) DO NOTHING`,
    params
  );
  return result.rowCount ?? 0;
}
