import { assertCents } from './money';

export type ReversalOutcome = {
  /** Amount to take back from the spendable rewards balance now. */
  debitCents: number;
  /** Amount already spent; recorded and offset against future earnings, never charged. */
  shortfallCents: number;
};

export type EarningOffsetOutcome = {
  creditCents: number;
  offsetCents: number;
  remainingShortfallCents: number;
};

/** The spendable balance floors at zero; anything beyond it becomes a shortfall. */
export function applyRewardReversal(
  availableRewardCents: number,
  reversalCents: number
): ReversalOutcome {
  assertCents(availableRewardCents, 'availableRewardCents');
  assertCents(reversalCents, 'reversalCents');
  const debitCents = Math.min(availableRewardCents, reversalCents);
  return { debitCents, shortfallCents: reversalCents - debitCents };
}

/** Released earnings first pay down any outstanding rewards shortfall. */
export function offsetEarningAgainstShortfall(
  releasedAwardCents: number,
  outstandingShortfallCents: number
): EarningOffsetOutcome {
  assertCents(releasedAwardCents, 'releasedAwardCents');
  assertCents(outstandingShortfallCents, 'outstandingShortfallCents');
  const offsetCents = Math.min(releasedAwardCents, outstandingShortfallCents);
  return {
    creditCents: releasedAwardCents - offsetCents,
    offsetCents,
    remainingShortfallCents: outstandingShortfallCents - offsetCents,
  };
}
