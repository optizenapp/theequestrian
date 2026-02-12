import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import {
  cancelScheduledReviewEmailsByOrderId,
  getShopifyOrderCancellationState,
  shouldCancelReviewScheduleFromOrderState,
} from '@/lib/reviews/review-email-cancellation';

type ScheduledOrderRow = {
  order_id: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 100, 1), 500);
    const dryRun = body?.dryRun === true;
    const singleOrderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';

    const rows: ScheduledOrderRow[] = singleOrderId
      ? [{ order_id: singleOrderId }]
      : ((await sql`
          SELECT DISTINCT order_id
          FROM review_email_sends
          WHERE status = 'scheduled'
          ORDER BY order_id
          LIMIT ${limit}
        `).rows as ScheduledOrderRow[]);
    const processed: Array<{
      orderId: string;
      action: 'skipped' | 'cancelled' | 'failed';
      reason: string;
      cancelledCount?: number;
    }> = [];

    for (const row of rows) {
      const orderId = row.order_id;
      try {
        const orderState = await getShopifyOrderCancellationState(orderId);
        if (!orderState) {
          processed.push({
            orderId,
            action: 'failed',
            reason: 'Order not found in Shopify Admin API',
          });
          continue;
        }

        const shouldCancel = shouldCancelReviewScheduleFromOrderState(orderState);
        if (!shouldCancel) {
          processed.push({
            orderId,
            action: 'skipped',
            reason: `Not cancelled/refunded-before-fulfilled (${orderState.displayFinancialStatus}, ${orderState.displayFulfillmentStatus})`,
          });
          continue;
        }

        if (dryRun) {
          processed.push({
            orderId,
            action: 'cancelled',
            reason: 'Dry run matched cancellation criteria',
            cancelledCount: 0,
          });
          continue;
        }

        const results = await cancelScheduledReviewEmailsByOrderId(
          orderId,
          'Backfill cancellation for refunded/cancelled order'
        );
        const cancelledCount = results.filter((result) => result.cancelled).length;
        const failedCount = results.length - cancelledCount;
        processed.push({
          orderId,
          action: failedCount > 0 ? 'failed' : 'cancelled',
          reason:
            failedCount > 0
              ? `Cancelled ${cancelledCount}/${results.length}; some provider cancellations failed`
              : `Cancelled ${cancelledCount} scheduled sends`,
          cancelledCount,
        });
      } catch (error) {
        processed.push({
          orderId,
          action: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      examinedOrders: rows.length,
      cancelledOrders: processed.filter((row) => row.action === 'cancelled').length,
      failedOrders: processed.filter((row) => row.action === 'failed').length,
      processed,
    });
  } catch (error) {
    console.error('Backfill cancellation run failed:', error);
    return NextResponse.json({ error: 'Failed to run cancellation backfill' }, { status: 500 });
  }
}
