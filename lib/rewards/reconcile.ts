import { getBucketTotals, getStoredRewardOrder, insertMovements, upsertRewardOrder } from './ledger';
import { fetchRewardsOrder } from './order-source';
import { buildOrderCalculation, deriveOrderRewardState, isPaidOrder } from './order-state';
import { planRewardMovements } from './plan-movements';
import { getRewardsSettings } from './settings';
import { syncCustomerStoreCredit, type CreditSyncOutcome } from './credit-sync';

export type ReconcileOutcome =
  | { kind: 'skipped'; reason: string }
  | { kind: 'reconciled'; status: string; awardCents: number; movementsWritten: number; credit: CreditSyncOutcome['kind'] | 'off' };

/**
 * Brings one order's rewards record in line with Shopify's current order state.
 * Safe to call repeatedly, out of order, or concurrently for the same order.
 * Store credit is only written when issuance is switched on.
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

  let credit: CreditSyncOutcome['kind'] | 'off' = 'off';
  if (settings.issuanceEnabled && snapshot.customerId) {
    try {
      const newReversalCents =
        movementsWritten > 0
          ? movements.filter((m) => m.bucket === 'available' && m.amountCents < 0).reduce((sum, m) => sum - m.amountCents, 0)
          : 0;
      credit = (await syncCustomerStoreCredit(snapshot.customerId, newReversalCents)).kind;
    } catch (error) {
      credit = 'failed';
      console.error('[rewards] Store credit sync failed; catch-up will retry:', { orderId: snapshot.orderId, error });
    }
  }

  return { kind: 'reconciled', status: state.status, awardCents: state.awardCents, movementsWritten, credit };
}
