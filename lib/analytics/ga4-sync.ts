import { sql } from '@vercel/postgres';

type QueuedGa4Event = {
  id: number;
  order_id: string;
  order_number: string;
  currency: string;
  total_amount: string | number;
  items: unknown;
};

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildPayload = (event: QueuedGa4Event) => {
  const items = Array.isArray(event.items) ? event.items : [];
  return {
    client_id: `order-${event.order_id}`,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: event.order_number,
          value: toNumber(event.total_amount),
          currency: event.currency || 'AUD',
          items: items.map((item: any) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: toNumber(item.quantity),
            price: toNumber(item.price),
          })),
        },
      },
    ],
  };
};

export async function syncQueuedGa4PurchaseEvents(limit = 100) {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    throw new Error('Missing GA4 Measurement Protocol credentials');
  }

  const result = await sql`
    SELECT 
      id,
      order_id,
      order_number,
      customer_email,
      total_amount,
      currency,
      items,
      created_at
    FROM ga4_purchase_events
    WHERE sent_to_ga4 = FALSE
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;

  const sentEventIds: number[] = [];
  const failed: Array<{ orderId: string; status?: number; error: string }> = [];

  for (const row of result.rows) {
    const payload = buildPayload({
      id: Number(row.id),
      order_id: row.order_id,
      order_number: row.order_number,
      currency: row.currency,
      total_amount: row.total_amount,
      items: row.items,
    });

    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        sentEventIds.push(Number(row.id));
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        failed.push({
          orderId: row.order_id,
          status: response.status,
          error: errorText,
        });
        console.error('GA4 sync failed for order:', row.order_id, errorText);
      }
    } catch (error) {
      failed.push({
        orderId: row.order_id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('GA4 sync request error for order:', row.order_id, error);
    }
  }

  if (sentEventIds.length > 0) {
    for (const id of sentEventIds) {
      await sql`
        UPDATE ga4_purchase_events
        SET sent_to_ga4 = TRUE, sent_at = NOW()
        WHERE id = ${id}
      `;
    }
  }

  return {
    attempted: result.rows.length,
    synced: sentEventIds.length,
    failedCount: failed.length,
    failed,
  };
}

