import { sql } from '@/lib/db/vercel-postgres';

export type CustomerRewardOrder = {
  orderName: string;
  status: string;
  awardCents: number;
  originalAwardCents: number;
  orderCreatedAt: string;
};

export type CustomerRewards = {
  pendingCents: number;
  availableCents: number;
  orders: CustomerRewardOrder[];
};

/** Only ever called with a customer ID from a verified Customer Account session. */
export async function getCustomerRewards(customerId: string): Promise<CustomerRewards> {
  const [totals, orders] = await Promise.all([
    sql<{ pending: string | null; available: string | null }>`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE bucket = 'pending'), 0) AS pending,
        COALESCE(SUM(amount_cents) FILTER (WHERE bucket = 'available'), 0) AS available
      FROM rewards_movements WHERE customer_id = ${customerId}
    `,
    sql<{
      order_name: string | null;
      status: string;
      current_award_cents: number;
      original_award_cents: number;
      order_created_at: string | Date;
    }>`
      SELECT order_name, status, current_award_cents, original_award_cents, order_created_at
      FROM rewards_orders
      WHERE customer_id = ${customerId}
      ORDER BY order_created_at DESC
      LIMIT 50
    `,
  ]);
  return {
    pendingCents: Math.max(0, Number(totals.rows[0]?.pending ?? 0)),
    availableCents: Math.max(0, Number(totals.rows[0]?.available ?? 0)),
    orders: orders.rows.map((row) => ({
      orderName: row.order_name ?? 'Order',
      status: row.status,
      awardCents: row.current_award_cents,
      originalAwardCents: row.original_award_cents,
      orderCreatedAt: new Date(row.order_created_at).toISOString(),
    })),
  };
}
