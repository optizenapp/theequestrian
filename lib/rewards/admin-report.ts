import { sql } from '@/lib/db/vercel-postgres';

export type RewardsSummary = {
  pendingOrders: number;
  releasedOrders: number;
  voidOrders: number;
  pendingCents: number;
  availableCents: number;
  originalAwardCents: number;
  reversedCents: number;
  staleOrders: number;
};

export type RewardsOrderRow = {
  orderId: string;
  orderName: string | null;
  status: string;
  originalAwardCents: number;
  currentAwardCents: number;
  eligibleCents: number;
  orderCreatedAt: string;
  releasedAt: string | null;
  lastReconciledAt: string;
};

type SummaryRow = Record<keyof RewardsSummary, string | null>;

export async function getRewardsSummary(): Promise<RewardsSummary> {
  const result = await sql<SummaryRow>`
    SELECT
      (SELECT COUNT(*) FROM rewards_orders WHERE status = 'pending') AS "pendingOrders",
      (SELECT COUNT(*) FROM rewards_orders WHERE status = 'released') AS "releasedOrders",
      (SELECT COUNT(*) FROM rewards_orders WHERE status = 'void') AS "voidOrders",
      (SELECT COALESCE(SUM(amount_cents), 0) FROM rewards_movements WHERE bucket = 'pending') AS "pendingCents",
      (SELECT COALESCE(SUM(amount_cents), 0) FROM rewards_movements WHERE bucket = 'available') AS "availableCents",
      (SELECT COALESCE(SUM(original_award_cents), 0) FROM rewards_orders) AS "originalAwardCents",
      (SELECT COALESCE(SUM(original_award_cents - current_award_cents), 0) FROM rewards_orders) AS "reversedCents",
      (SELECT COUNT(*) FROM rewards_orders
        WHERE status = 'pending' AND order_created_at < NOW() - INTERVAL '30 days') AS "staleOrders"
  `;
  const row = result.rows[0];
  const num = (key: keyof RewardsSummary) => Number(row?.[key] ?? 0);
  return {
    pendingOrders: num('pendingOrders'),
    releasedOrders: num('releasedOrders'),
    voidOrders: num('voidOrders'),
    pendingCents: num('pendingCents'),
    availableCents: num('availableCents'),
    originalAwardCents: num('originalAwardCents'),
    reversedCents: num('reversedCents'),
    staleOrders: num('staleOrders'),
  };
}

type OrderRow = {
  order_id: string;
  order_name: string | null;
  status: string;
  original_award_cents: number;
  current_award_cents: number;
  eligible_cents: string | null;
  order_created_at: string | Date;
  released_at: string | Date | null;
  last_reconciled_at: string | Date;
};

const iso = (value: string | Date) => new Date(value).toISOString();

export async function getRecentRewardOrders(limit = 50): Promise<RewardsOrderRow[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const result = await sql<OrderRow>`
    SELECT order_id, order_name, status, original_award_cents, current_award_cents,
      calculation->>'eligibleCents' AS eligible_cents,
      order_created_at, released_at, last_reconciled_at
    FROM rewards_orders
    ORDER BY order_created_at DESC
    LIMIT ${safeLimit}
  `;
  return result.rows.map((row) => ({
    orderId: row.order_id,
    orderName: row.order_name,
    status: row.status,
    originalAwardCents: row.original_award_cents,
    currentAwardCents: row.current_award_cents,
    eligibleCents: Number(row.eligible_cents ?? 0),
    orderCreatedAt: iso(row.order_created_at),
    releasedAt: row.released_at ? iso(row.released_at) : null,
    lastReconciledAt: iso(row.last_reconciled_at),
  }));
}
