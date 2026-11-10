import { assertCents } from './money';

export type CreditPlan =
  | { kind: 'none'; reason: 'in-sync' | 'shortfall' }
  | { kind: 'needs-balance' }
  | { kind: 'credit'; amountCents: number }
  | { kind: 'debit'; amountCents: number };

/**
 * Moves Shopify store credit towards the customer's earned target.
 * Owed rewards are credited. A reversal is debited only when it has just happened
 * (`maxDebitCents`), and only up to the live balance, so store credit from other sources
 * (e.g. refunds) is never chased for an old shortfall. Any unrecovered gap stays in the
 * totals and is filled by later earnings before new credit is issued.
 */
export function planCreditPosting(
  targetCents: number,
  postedNetCents: number,
  maxDebitCents = 0,
  balanceCents?: number
): CreditPlan {
  const delta = targetCents - postedNetCents;
  if (delta > 0) return { kind: 'credit', amountCents: delta };
  if (delta === 0) return { kind: 'none', reason: 'in-sync' };
  if (maxDebitCents <= 0) return { kind: 'none', reason: 'shortfall' };
  if (balanceCents === undefined) return { kind: 'needs-balance' };
  assertCents(balanceCents, 'balanceCents');
  const amountCents = Math.min(-delta, maxDebitCents, balanceCents);
  return amountCents > 0 ? { kind: 'debit', amountCents } : { kind: 'none', reason: 'shortfall' };
}
