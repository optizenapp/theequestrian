import { sql } from '@/lib/db/vercel-postgres';
import { reconcileOrderRewards } from './reconcile';

export type CatchUpResult = {
  candidates: number;
  reconciled: number;
  skipped: number;
  failed: number;
  movementsWritten: number;
};

/**
 * Re-checks orders a missed or failed webhook could have left behind:
 * pending orders every few hours, recently released ones daily (late returns).
 */
export async function runRewardsCatchUp(limit = 50, budgetMs = 240_000): Promise<CatchUpResult> {
  const startedAt = Date.now();
  const { rows } = await sql<{ order_id: string }>`
    SELECT order_id FROM rewards_orders
    WHERE (status = 'pending' AND last_reconciled_at < NOW() - INTERVAL '3 hours')
       OR (status = 'released' AND order_created_at > NOW() - INTERVAL '90 days'
           AND last_reconciled_at < NOW() - INTERVAL '24 hours')
    ORDER BY last_reconciled_at ASC
    LIMIT ${limit}
  `;

  const result: CatchUpResult = { candidates: rows.length, reconciled: 0, skipped: 0, failed: 0, movementsWritten: 0 };
  for (const { order_id: orderId } of rows) {
    if (Date.now() - startedAt > budgetMs) break;
    try {
      const outcome = await reconcileOrderRewards(orderId);
      if (outcome.kind === 'reconciled') {
        result.reconciled += 1;
        result.movementsWritten += outcome.movementsWritten;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error('[rewards:catch-up] Reconcile failed:', { orderId, error });
    }
  }
  return result;
}
