import { sql } from '@/lib/db/vercel-postgres';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

type ScheduledEmailRow = {
  id: string;
  order_id: string;
  resend_email_id: string | null;
};

export type ReviewEmailCancellationResult = {
  id: string;
  orderId: string;
  cancelled: boolean;
  message: string;
};

export type ShopifyOrderCancellationState = {
  orderId: string;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
};

function toOrderGid(orderId: string): string {
  return orderId.startsWith('gid://shopify/Order/') ? orderId : `gid://shopify/Order/${orderId}`;
}

export function extractResendEmailId(sendResult: unknown): string | null {
  if (typeof sendResult === 'string' && sendResult.length > 0) {
    return sendResult;
  }
  return null;
}

async function cancelResendScheduledEmail(resendEmailId: string): Promise<{ ok: boolean; message: string }> {
  void resendEmailId;
  return {
    ok: true,
    message: 'Cancelled in DB only (SES has no scheduled-send cancel API)',
  };
}

async function loadScheduledEmailById(emailSendId: string): Promise<ScheduledEmailRow | null> {
  const result = await sql`
    SELECT id, order_id, resend_email_id
    FROM review_email_sends
    WHERE id = ${emailSendId}
      AND status = 'scheduled'
    LIMIT 1
  `;
  return (result.rows[0] as ScheduledEmailRow | undefined) ?? null;
}

async function loadScheduledEmailsByOrderId(orderId: string): Promise<ScheduledEmailRow[]> {
  const result = await sql`
    SELECT id, order_id, resend_email_id
    FROM review_email_sends
    WHERE order_id = ${orderId}
      AND status = 'scheduled'
    ORDER BY created_at DESC
  `;
  return result.rows as ScheduledEmailRow[];
}

async function markEmailCancelled(
  emailSendId: string,
  reason: string,
  errorMessage: string | null
): Promise<boolean> {
  const result = await sql`
    UPDATE review_email_sends
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancel_reason = ${reason},
        error_message = ${errorMessage}
    WHERE id = ${emailSendId}
      AND status = 'scheduled'
    RETURNING id
  `;
  return (result.rowCount ?? 0) > 0;
}

async function markEmailCancelFailure(emailSendId: string, errorMessage: string): Promise<void> {
  await sql`
    UPDATE review_email_sends
    SET error_message = ${errorMessage}
    WHERE id = ${emailSendId}
      AND status = 'scheduled'
  `;
}

async function cancelScheduledRow(
  row: ScheduledEmailRow,
  reason: string
): Promise<ReviewEmailCancellationResult> {
  if (!row.resend_email_id) {
    const message = 'Missing resend_email_id. Marked cancelled in DB only.';
    const cancelled = await markEmailCancelled(row.id, reason, message);
    return {
      id: row.id,
      orderId: row.order_id,
      cancelled,
      message,
    };
  }

  const providerResult = await cancelResendScheduledEmail(row.resend_email_id);
  if (!providerResult.ok) {
    await markEmailCancelFailure(row.id, providerResult.message);
    return {
      id: row.id,
      orderId: row.order_id,
      cancelled: false,
      message: providerResult.message,
    };
  }

  const cancelled = await markEmailCancelled(row.id, reason, null);
  return {
    id: row.id,
    orderId: row.order_id,
    cancelled,
    message: providerResult.message,
  };
}

export async function cancelScheduledReviewEmailById(
  emailSendId: string,
  reason: string
): Promise<ReviewEmailCancellationResult | null> {
  const row = await loadScheduledEmailById(emailSendId);
  if (!row) {
    return null;
  }
  return cancelScheduledRow(row, reason);
}

export async function cancelScheduledReviewEmailsByOrderId(
  orderId: string,
  reason: string
): Promise<ReviewEmailCancellationResult[]> {
  const rows = await loadScheduledEmailsByOrderId(orderId);
  const results: ReviewEmailCancellationResult[] = [];

  for (const row of rows) {
    const result = await cancelScheduledRow(row, reason);
    results.push(result);
  }

  return results;
}

export async function getShopifyOrderCancellationState(
  orderId: string
): Promise<ShopifyOrderCancellationState | null> {
  const query = `
    query OrderCancellationState($id: ID!) {
      order(id: $id) {
        id
        cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    order: {
      id: string;
      cancelledAt: string | null;
      displayFinancialStatus: string;
      displayFulfillmentStatus: string;
    } | null;
  }>({
    query,
    variables: { id: toOrderGid(orderId) },
  });

  if (!data.order) {
    return null;
  }

  return {
    orderId,
    cancelledAt: data.order.cancelledAt,
    displayFinancialStatus: data.order.displayFinancialStatus || 'UNKNOWN',
    displayFulfillmentStatus: data.order.displayFulfillmentStatus || 'UNKNOWN',
  };
}

export function shouldCancelReviewScheduleFromOrderState(
  state: ShopifyOrderCancellationState
): boolean {
  const financialStatus = state.displayFinancialStatus.toUpperCase();
  const fulfillmentStatus = state.displayFulfillmentStatus.toUpperCase();

  if (state.cancelledAt) {
    return true;
  }

  const isRefunded =
    financialStatus === 'REFUNDED' || financialStatus === 'PARTIALLY_REFUNDED';
  const isAlreadyFulfilled =
    fulfillmentStatus === 'FULFILLED' || fulfillmentStatus === 'PARTIALLY_FULFILLED';

  return isRefunded && !isAlreadyFulfilled;
}
