import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * GA4 Purchase Event Sync
 * 
 * Fetches queued purchase events and sends them to GA4 via Measurement Protocol.
 * Run this as a cron job or manually from admin dashboard.
 * 
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildPayload = (event: {
  order_id: string;
  order_number: string;
  currency: string;
  total_amount: string | number;
  items: any;
}) => {
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

export async function POST() {
  try {
    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;

    if (!measurementId || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing GA4 Measurement Protocol credentials' },
        { status: 503 }
      );
    }

    // Get unsent events
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
      LIMIT 100
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events to sync',
        synced: 0,
      });
    }

    const sentEventIds: number[] = [];

    for (const row of result.rows) {
      const payload = buildPayload({
        order_id: row.order_id,
        order_number: row.order_number,
        currency: row.currency,
        total_amount: row.total_amount,
        items: row.items,
      });

      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        sentEventIds.push(row.id);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('GA4 sync failed for order:', row.order_id, errorText);
      }
    }

    if (sentEventIds.length > 0) {
      await sql`
        UPDATE ga4_purchase_events
        SET sent_to_ga4 = TRUE, sent_at = NOW()
        WHERE id = ANY(ARRAY[${sentEventIds.join(',')}]::INTEGER[])
      `;
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${sentEventIds.length} purchase events to GA4`,
      synced: sentEventIds.length,
    });
  } catch (error) {
    console.error('GA4 sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync GA4 events' },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET() {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE sent_to_ga4 = FALSE) as pending,
        COUNT(*) FILTER (WHERE sent_to_ga4 = TRUE) as sent,
        COUNT(*) as total
      FROM ga4_purchase_events
    `;

    return NextResponse.json({
      pending: parseInt(stats.rows[0].pending || '0'),
      sent: parseInt(stats.rows[0].sent || '0'),
      total: parseInt(stats.rows[0].total || '0'),
    });
  } catch (error) {
    console.error('GA4 stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get GA4 stats' },
      { status: 500 }
    );
  }
}
