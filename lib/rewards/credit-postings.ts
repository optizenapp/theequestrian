import { sql } from '@/lib/db/vercel-postgres';

export type PostingStatus = 'in_flight' | 'posted' | 'failed' | 'ambiguous';

export type CustomerCreditState = {
  targetCents: number;
  postedNetCents: number;
  hasOpenPosting: boolean;
};

export type CreditPostingRow = {
  id: number;
  customerId: string;
  kind: 'credit' | 'debit';
  amountCents: number;
  status: PostingStatus;
  shopifyTransactionId: string | null;
  error: string | null;
  createdAt: string;
};

export async function getCustomerCreditState(customerId: string, currency: string): Promise<CustomerCreditState> {
  const { rows } = await sql<{ target: string; posted: string; open_count: string }>`
    SELECT
      (SELECT COALESCE(SUM(amount_cents), 0) FROM rewards_movements
        WHERE customer_id = ${customerId} AND bucket = 'available' AND currency = ${currency}) AS target,
      (SELECT COALESCE(SUM(CASE WHEN kind = 'credit' THEN amount_cents ELSE -amount_cents END), 0)
        FROM rewards_credit_postings
        WHERE customer_id = ${customerId} AND currency = ${currency} AND status = 'posted') AS posted,
      (SELECT COUNT(*) FROM rewards_credit_postings
        WHERE customer_id = ${customerId} AND status IN ('in_flight', 'ambiguous')) AS open_count
  `;
  const row = rows[0];
  return {
    targetCents: Number(row?.target ?? 0),
    postedNetCents: Number(row?.posted ?? 0),
    hasOpenPosting: Number(row?.open_count ?? 0) > 0,
  };
}

/** Returns null when another write for this customer is already unresolved (enforced by a unique index). */
export async function claimPosting(
  customerId: string,
  kind: 'credit' | 'debit',
  amountCents: number,
  currency: string
): Promise<number | null> {
  const { rows } = await sql<{ id: number }>`
    INSERT INTO rewards_credit_postings (customer_id, kind, amount_cents, currency, status)
    VALUES (${customerId}, ${kind}, ${amountCents}, ${currency}, 'in_flight')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  return rows[0]?.id ?? null;
}

export async function finishPosting(
  id: number,
  status: Exclude<PostingStatus, 'in_flight'>,
  transactionId: string | null,
  error: string | null
): Promise<void> {
  await sql`
    UPDATE rewards_credit_postings
    SET status = ${status}, shopify_transaction_id = ${transactionId}, error = ${error}, updated_at = NOW()
    WHERE id = ${id} AND status = 'in_flight'
  `;
}

/** An admin confirms in Shopify whether an unresolved write actually happened. */
export async function resolvePosting(id: number, outcome: 'posted' | 'failed'): Promise<boolean> {
  const result = await sql`
    UPDATE rewards_credit_postings
    SET status = ${outcome}, error = COALESCE(error, '') || ' [resolved by admin]', updated_at = NOW()
    WHERE id = ${id} AND status IN ('in_flight', 'ambiguous')
  `;
  return (result.rowCount ?? 0) > 0;
}

export async function getRecentPostings(limit: number): Promise<CreditPostingRow[]> {
  const { rows } = await sql<{
    id: number; customer_id: string; kind: 'credit' | 'debit'; amount_cents: number; status: PostingStatus;
    shopify_transaction_id: string | null; error: string | null; created_at: string | Date;
  }>`
    SELECT id, customer_id, kind, amount_cents, status, shopify_transaction_id, error, created_at
    FROM rewards_credit_postings
    ORDER BY (status IN ('in_flight', 'ambiguous')) DESC, created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    id: Number(row.id),
    customerId: row.customer_id,
    kind: row.kind,
    amountCents: row.amount_cents,
    status: row.status,
    shopifyTransactionId: row.shopify_transaction_id,
    error: row.error,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
