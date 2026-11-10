import { sql } from '@/lib/db/vercel-postgres';
import { syncCustomerStoreCredit } from './credit-sync';
import { getRewardsSettings } from './settings';

export type CreditCatchUpResult = { enabled: boolean; candidates: number; posted: number; other: number; failed: number };

/** Retries credits owed to customers (e.g. after a failed write). Reversals are only debited at the time they happen. */
export async function runCreditCatchUp(limit = 50, budgetMs = 60_000): Promise<CreditCatchUpResult> {
  const settings = await getRewardsSettings();
  if (!settings.issuanceEnabled) return { enabled: false, candidates: 0, posted: 0, other: 0, failed: 0 };

  const startedAt = Date.now();
  const { rows } = await sql<{ customer_id: string }>`
    WITH target AS (
      SELECT customer_id, SUM(amount_cents) AS cents FROM rewards_movements
      WHERE bucket = 'available' AND currency = 'AUD' AND customer_id IS NOT NULL
      GROUP BY customer_id
    ), posted AS (
      SELECT customer_id, SUM(CASE WHEN kind = 'credit' THEN amount_cents ELSE -amount_cents END) AS cents
      FROM rewards_credit_postings WHERE status = 'posted' AND currency = 'AUD'
      GROUP BY customer_id
    )
    SELECT target.customer_id FROM target LEFT JOIN posted USING (customer_id)
    WHERE target.cents > COALESCE(posted.cents, 0)
      AND NOT EXISTS (
        SELECT 1 FROM rewards_credit_postings op
        WHERE op.customer_id = target.customer_id AND op.status IN ('in_flight', 'ambiguous')
      )
    LIMIT ${limit}
  `;

  const result: CreditCatchUpResult = { enabled: true, candidates: rows.length, posted: 0, other: 0, failed: 0 };
  for (const { customer_id: customerId } of rows) {
    if (Date.now() - startedAt > budgetMs) break;
    try {
      const outcome = await syncCustomerStoreCredit(customerId);
      if (outcome.kind === 'posted') result.posted += 1;
      else if (outcome.kind === 'failed' || outcome.kind === 'ambiguous') result.failed += 1;
      else result.other += 1;
    } catch (error) {
      result.failed += 1;
      console.error('[rewards:credit-catch-up] Sync failed:', { customerId, error });
    }
  }
  return result;
}
