import { allocateCents, assertCents, percentOfCentsHalfUp } from './money';
import type { RewardCalculation, RewardCalculationInput, RewardLineInput } from './types';

export const DEFAULT_REWARD_RATE_BPS = 200;

function assertLine(line: RewardLineInput): void {
  if (!line.lineId) throw new RangeError('Reward line is missing lineId');
  if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
    throw new RangeError(`Line ${line.lineId} quantity must be a positive integer`);
  }
  assertCents(line.netCents, `line ${line.lineId} netCents`);
}

export function maxRedeemableCents(balanceCents: number, eligibleCents: number): number {
  assertCents(balanceCents, 'balanceCents');
  assertCents(eligibleCents, 'eligibleCents');
  return Math.min(balanceCents, eligibleCents);
}

/**
 * Single source of truth for reward estimates and final settlement.
 * Redemption is capped at eligible merchandise and spread across eligible lines once;
 * the award is rounded once for the whole order, then spread back across lines for returns.
 */
export function calculateRewards(input: RewardCalculationInput): RewardCalculation {
  assertCents(input.requestedRedemptionCents, 'requestedRedemptionCents');
  assertCents(input.rateBps, 'rateBps');
  input.lines.forEach(assertLine);

  const eligibleWeights = input.lines.map((line) => (line.eligible ? line.netCents : 0));
  const eligibleCents = eligibleWeights.reduce((sum, cents) => sum + cents, 0);
  const redeemedCents = maxRedeemableCents(input.requestedRedemptionCents, eligibleCents);
  const redeemedByLine = allocateCents(redeemedCents, eligibleWeights);

  const payableByLine = eligibleWeights.map((cents, index) => cents - redeemedByLine[index]);
  const payableEligibleCents = eligibleCents - redeemedCents;
  const awardCents = percentOfCentsHalfUp(payableEligibleCents, input.rateBps);
  const awardByLine = allocateCents(awardCents, payableByLine);

  return {
    rateBps: input.rateBps,
    eligibleCents,
    redeemedCents,
    payableEligibleCents,
    awardCents,
    lines: input.lines.map((line, index) => ({
      lineId: line.lineId,
      quantity: line.quantity,
      eligible: line.eligible,
      netCents: line.netCents,
      redeemedCents: redeemedByLine[index],
      awardCents: awardByLine[index],
    })),
  };
}
