import { planCreditPosting, type CreditPlan } from './credit-plan';
import { claimPosting, finishPosting, getCustomerCreditState } from './credit-postings';
import { getStoreCreditBalanceCents, postStoreCredit } from './store-credit-client';

const CURRENCY = 'AUD';

export type CreditSyncOutcome =
  | { kind: 'none'; reason: string }
  | { kind: 'blocked'; reason: string }
  | { kind: 'posted' | 'failed' | 'ambiguous'; posting: 'credit' | 'debit'; amountCents: number; error?: string };

async function currentPlan(customerId: string, maxDebitCents: number): Promise<{ plan: CreditPlan; hasOpenPosting: boolean }> {
  const state = await getCustomerCreditState(customerId, CURRENCY);
  let plan = planCreditPosting(state.targetCents, state.postedNetCents, maxDebitCents);
  if (plan.kind === 'needs-balance') {
    const balance = await getStoreCreditBalanceCents(customerId, CURRENCY);
    plan = planCreditPosting(state.targetCents, state.postedNetCents, maxDebitCents, balance);
  }
  return { plan, hasOpenPosting: state.hasOpenPosting };
}

/**
 * Writes at most one store credit transaction bringing the customer's Shopify balance in line
 * with what they've earned. Safe to call repeatedly and concurrently: a claimed in-flight row
 * blocks every other writer for the customer, and the plan is re-checked after claiming.
 * `maxDebitCents` is the reversal that just happened; 0 means only credits are written.
 */
export async function syncCustomerStoreCredit(customerId: string, maxDebitCents = 0): Promise<CreditSyncOutcome> {
  const first = await currentPlan(customerId, maxDebitCents);
  if (first.hasOpenPosting) return { kind: 'blocked', reason: 'an earlier store credit write needs review' };
  if (first.plan.kind !== 'credit' && first.plan.kind !== 'debit') {
    return { kind: 'none', reason: first.plan.kind === 'none' ? first.plan.reason : 'nothing to do' };
  }

  const { kind, amountCents } = first.plan;
  const postingId = await claimPosting(customerId, kind, amountCents, CURRENCY);
  if (postingId === null) return { kind: 'blocked', reason: 'another store credit write is in progress' };

  try {
    const recheck = await currentPlan(customerId, maxDebitCents);
    if (recheck.plan.kind !== kind || recheck.plan.amountCents !== amountCents) {
      await finishPosting(postingId, 'failed', null, 'Superseded: totals changed before posting');
      return { kind: 'none', reason: 'totals changed; will retry' };
    }
  } catch (error) {
    await finishPosting(postingId, 'failed', null, `Pre-post check failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }

  const result = await postStoreCredit(kind, customerId, amountCents, CURRENCY);
  if (result.outcome === 'posted') {
    await finishPosting(postingId, 'posted', result.transactionId, null);
    return { kind: 'posted', posting: kind, amountCents };
  }
  await finishPosting(postingId, result.outcome, null, result.error);
  console.error('[rewards:credit] Store credit write did not complete:', { postingId, kind, outcome: result.outcome, error: result.error });
  return { kind: result.outcome, posting: kind, amountCents, error: result.error };
}
