import { allocateCents, percentOfCentsHalfUp } from './money';
import type { RewardCalculation, ReturnedQuantity, ReturnSettlement } from './types';

function sumLastUnits(unitCents: number[], count: number): number {
  return unitCents.slice(unitCents.length - count).reduce((sum, cents) => sum + cents, 0);
}

/**
 * Settles cumulative returns against the order's original allocations.
 * Pass every quantity returned to date: the result is the full entitlement now,
 * so callers diff it against movements already recorded rather than applying it twice.
 */
export function settleReturns(
  original: RewardCalculation,
  returned: ReturnedQuantity[]
): ReturnSettlement {
  const returnedByLine = new Map<string, number>();
  for (const entry of returned) {
    if (!Number.isSafeInteger(entry.quantity) || entry.quantity < 0) {
      throw new RangeError(`Returned quantity for ${entry.lineId} must be a non-negative integer`);
    }
    returnedByLine.set(entry.lineId, (returnedByLine.get(entry.lineId) ?? 0) + entry.quantity);
  }

  let redeemedRestoredCents = 0;
  let cashRefundableCents = 0;
  let retainedPayableEligibleCents = 0;

  for (const line of original.lines) {
    const returnedQty = returnedByLine.get(line.lineId) ?? 0;
    if (returnedQty > line.quantity) {
      throw new RangeError(`Line ${line.lineId} returned ${returnedQty} of ${line.quantity}`);
    }
    returnedByLine.delete(line.lineId);

    const unitWeights = Array.from({ length: line.quantity }, () => 1);
    const unitNet = allocateCents(line.netCents, unitWeights);
    const unitRedeemed = allocateCents(line.redeemedCents, unitWeights);
    const returnedNet = sumLastUnits(unitNet, returnedQty);
    const returnedRedeemed = sumLastUnits(unitRedeemed, returnedQty);

    redeemedRestoredCents += returnedRedeemed;
    cashRefundableCents += returnedNet - returnedRedeemed;
    if (line.eligible) {
      retainedPayableEligibleCents +=
        line.netCents - line.redeemedCents - (returnedNet - returnedRedeemed);
    }
  }

  if (returnedByLine.size > 0) {
    throw new RangeError(`Unknown returned lines: ${[...returnedByLine.keys()].join(', ')}`);
  }

  const finalAwardCents = percentOfCentsHalfUp(retainedPayableEligibleCents, original.rateBps);
  return {
    originalAwardCents: original.awardCents,
    finalAwardCents,
    awardReversalCents: original.awardCents - finalAwardCents,
    redeemedRestoredCents,
    cashRefundableCents,
    retainedPayableEligibleCents,
  };
}
