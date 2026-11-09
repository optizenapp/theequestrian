import { getBucketTotals, getStoredRewardOrder, insertMovements, upsertRewardOrder } from './ledger';
import { fetchRewardsOrder } from './order-source';
import { buildOrderCalculation, deriveOrderRewardState, isPaidOrder } from './order-state';
import { planRewardMovements } from './plan-movements';
import { getRewardsSettings } from './settings';

export type ReconcileOutcome =
  | { kind: 'skipped'; reason: string }
  | { kind: 'reconciled'; status: string; awardCents: number; movementsWritten: number };

/**
 * Brings one order's rewards record in line with Shopify's current order state.
 * Safe to call repeatedly, out of order, or concurrently for the same order.
 * Record-only: nothing here issues spendable credit.
 */
export async function reconcileOrderRewards(orderGid: string): Promise<ReconcileOutcome> {
  const settings = await getRewardsSettings();
  if (!settings.recordingEnabled || !settings.launchAt) {
    return { kind: 'skipped', reason: 'recording disabled or no launch timestamp' };
  }

  const snapshot = await fetchRewardsOrder(orderGid);
  if (!snapshot) return { kind: 'skipped', reason: 'order not found' };
  if (snapshot.test) return { kind: 'skipped', reason: 'test order' };
  if (snapshot.createdAt < settings.launchAt) {
    return { kind: 'skipped', reason: 'order predates launch' };
  }
  if (snapshot.currency !== 'AUD') return { kind: 'skipped', reason: 'non-AUD order' };

  const stored = await getStoredRewardOrder(snapshot.orderId);
  if (!stored && (!isPaidOrder(snapshot) || snapshot.cancelled)) {
    return { kind: 'skipped', reason: 'order not paid yet' };
  }

  const calculation = stored?.calculation ?? buildOrderCalculation(snapshot, settings.rateBps);
  const state = deriveOrderRewardState(snapshot, calculation, stored?.status === 'released');
  await upsertRewardOrder(snapshot, calculation, state);

  const totals = await getBucketTotals(snapshot.orderId);
  const movements = planRewardMovements(snapshot.orderId, totals, state);
  const movementsWritten = await insertMovements(snapshot, movements);

  return { kind: 'reconciled', status: state.status, awardCents: state.awardCents, movementsWritten };
}
