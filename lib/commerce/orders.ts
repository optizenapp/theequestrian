import crypto from 'crypto';
import { sql } from '@/lib/db/client';

export type CommerceOrderItemInput = {
  canonicalVariantId: number;
  integrationId: number;
  quantity: number;
  unitPriceCents: number;
};

export type CreateCommerceOrderInput = {
  customerEmail: string;
  currencyCode: string;
  shippingCents: number;
  paymentIntentId: string;
  idempotencyKey?: string;
  items: CommerceOrderItemInput[];
};

export type CreateCommerceOrderResult = {
  orderId: number;
  orderNumber: string;
  totalCents: number;
  lineCount: number;
  childOrderCount: number;
  idempotencyKey: string;
};

function buildOrderNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TE-${y}${m}${d}-${rnd}`;
}

function centsTotal(items: CommerceOrderItemInput[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export async function createCommerceOrder(input: CreateCommerceOrderInput): Promise<CreateCommerceOrderResult> {
  const orderNumber = buildOrderNumber();
  const idempotencyKey = input.idempotencyKey || crypto.randomUUID();
  const subtotalCents = centsTotal(input.items);
  const totalCents = subtotalCents + input.shippingCents;

  type OrderRow = { id: number; order_number: string };

  const insertedOrderRaw = await sql`
    INSERT INTO commerce_orders (
      order_number, customer_email, currency_code,
      subtotal_cents, shipping_cents, total_cents,
      payment_status, order_status, stripe_payment_intent_id, idempotency_key
    ) VALUES (
      ${orderNumber},
      ${input.customerEmail.trim().toLowerCase()},
      ${input.currencyCode.toUpperCase()},
      ${subtotalCents},
      ${input.shippingCents},
      ${totalCents},
      'authorized',
      'pending_routing',
      ${input.paymentIntentId},
      ${idempotencyKey}
    )
    ON CONFLICT (idempotency_key) DO UPDATE
    SET updated_at = NOW()
    RETURNING id, order_number
  `;
  const insertedOrder = Array.isArray(insertedOrderRaw)
    ? (insertedOrderRaw as OrderRow[])
    : [];
  const firstOrder = insertedOrder[0];
  if (!firstOrder) {
    throw new Error('Failed to insert commerce order');
  }
  const orderId = Number(firstOrder.id);
  const finalOrderNumber = String(firstOrder.order_number);

  const rawItems = JSON.stringify(input.items);
  const insertedLinesRaw = await sql`
    WITH line_data AS (
      SELECT
        (item->>'canonicalVariantId')::bigint AS canonical_variant_id,
        (item->>'integrationId')::integer AS integration_id,
        (item->>'quantity')::integer AS quantity,
        (item->>'unitPriceCents')::integer AS unit_price_cents
      FROM jsonb_array_elements(${rawItems}::jsonb) item
    )
    INSERT INTO commerce_order_lines (
      order_id, canonical_variant_id, integration_id, quantity, unit_price_cents, line_total_cents
    )
    SELECT
      ${orderId},
      canonical_variant_id,
      integration_id,
      quantity,
      unit_price_cents,
      quantity * unit_price_cents
    FROM line_data
    RETURNING id
  `;
  const insertedLines = Array.isArray(insertedLinesRaw) ? insertedLinesRaw : [];

  const insertedChildrenRaw = await sql`
    INSERT INTO vendor_child_orders (
      order_id, integration_id, route_status, route_attempts, status_timeline
    )
    SELECT DISTINCT
      ${orderId},
      integration_id,
      'queued',
      0,
      '[]'::jsonb
    FROM commerce_order_lines
    WHERE order_id = ${orderId}
    ON CONFLICT (order_id, integration_id) DO NOTHING
    RETURNING id
  `;
  const insertedChildren = Array.isArray(insertedChildrenRaw) ? insertedChildrenRaw : [];

  return {
    orderId,
    orderNumber: finalOrderNumber,
    totalCents,
    lineCount: insertedLines.length,
    childOrderCount: insertedChildren.length,
    idempotencyKey,
  };
}
