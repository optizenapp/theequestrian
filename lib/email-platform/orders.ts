import { sql } from '@/lib/db/vercel-postgres';

type ShopifyLineItem = {
  product_id?: string | number | null;
  product_type?: string | null;
  vendor?: string | null;
  title?: string | null;
  quantity?: number;
  price?: string | number | null;
};

type ShopifyOrderPayload = {
  id: string | number;
  order_number?: string | number;
  customer?: {
    id?: string | number | null;
    email?: string | null;
  } | null;
  created_at?: string | null;
  processed_at?: string | null;
  cancelled_at?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  currency?: string | null;
  subtotal_price?: string | number | null;
  total_price?: string | number | null;
  total_refunded_set?: {
    shop_money?: {
      amount?: string | number | null;
    } | null;
  } | null;
  line_items?: ShopifyLineItem[];
};

function numeric(input: string | number | null | undefined): number {
  if (input === null || input === undefined) {
    return 0;
  }
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function upsertOrderFactFromShopifyPayload(
  payload: ShopifyOrderPayload
): Promise<void> {
  const orderId = String(payload.id);
  const orderNumber = payload.order_number ? String(payload.order_number) : null;
  const customerEmail = payload.customer?.email ? normalizeEmail(payload.customer.email) : null;
  const shopifyCustomerId = payload.customer?.id ? String(payload.customer.id) : null;
  const lineItems = payload.line_items || [];

  let contactId: string | null = null;
  if (customerEmail) {
    const contactResult = await sql`
      SELECT id
      FROM email_contacts
      WHERE primary_email = ${customerEmail}
      LIMIT 1
    `;
    contactId = (contactResult.rows[0]?.id as string | undefined) ?? null;
  }

  await sql`
    INSERT INTO customer_order_facts (
      order_id,
      order_number,
      shopify_customer_id,
      contact_id,
      customer_email,
      order_created_at,
      order_fulfilled_at,
      financial_status,
      fulfillment_status,
      cancelled_at,
      currency,
      subtotal_amount,
      total_amount,
      total_refunded_amount,
      line_items,
      updated_at
    )
    VALUES (
      ${orderId},
      ${orderNumber},
      ${shopifyCustomerId},
      ${contactId},
      ${customerEmail},
      ${payload.created_at ?? null},
      ${payload.processed_at ?? null},
      ${payload.financial_status ?? null},
      ${payload.fulfillment_status ?? null},
      ${payload.cancelled_at ?? null},
      ${payload.currency ?? null},
      ${numeric(payload.subtotal_price)},
      ${numeric(payload.total_price)},
      ${numeric(payload.total_refunded_set?.shop_money?.amount ?? 0)},
      ${JSON.stringify(lineItems)},
      NOW()
    )
    ON CONFLICT (order_id)
    DO UPDATE SET
      order_number = EXCLUDED.order_number,
      shopify_customer_id = EXCLUDED.shopify_customer_id,
      contact_id = COALESCE(EXCLUDED.contact_id, customer_order_facts.contact_id),
      customer_email = COALESCE(EXCLUDED.customer_email, customer_order_facts.customer_email),
      order_created_at = COALESCE(EXCLUDED.order_created_at, customer_order_facts.order_created_at),
      order_fulfilled_at = COALESCE(EXCLUDED.order_fulfilled_at, customer_order_facts.order_fulfilled_at),
      financial_status = EXCLUDED.financial_status,
      fulfillment_status = EXCLUDED.fulfillment_status,
      cancelled_at = EXCLUDED.cancelled_at,
      currency = EXCLUDED.currency,
      subtotal_amount = EXCLUDED.subtotal_amount,
      total_amount = EXCLUDED.total_amount,
      total_refunded_amount = EXCLUDED.total_refunded_amount,
      line_items = EXCLUDED.line_items,
      updated_at = NOW()
  `;
}

export async function recomputeCustomerAggregates(contactId?: string): Promise<void> {
  if (contactId) {
    await sql`
      WITH metrics AS (
        SELECT
          contact_id,
          COUNT(*) AS order_count,
          COALESCE(SUM(total_amount), 0) AS lifetime_value,
          COALESCE(AVG(total_amount), 0) AS average_order_value,
          MIN(order_created_at) AS first_order_at,
          MAX(order_created_at) AS last_order_at
        FROM customer_order_facts
        WHERE contact_id = ${contactId}
        GROUP BY contact_id
      )
      INSERT INTO customer_aggregate_metrics (
        contact_id,
        order_count,
        lifetime_value,
        average_order_value,
        first_order_at,
        last_order_at,
        last_order_days_ago,
        updated_at
      )
      SELECT
        m.contact_id,
        m.order_count::INTEGER,
        m.lifetime_value,
        m.average_order_value,
        m.first_order_at,
        m.last_order_at,
        CASE
          WHEN m.last_order_at IS NULL THEN NULL
          ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - m.last_order_at)) / 86400)::INTEGER
        END,
        NOW()
      FROM metrics m
      ON CONFLICT (contact_id)
      DO UPDATE SET
        order_count = EXCLUDED.order_count,
        lifetime_value = EXCLUDED.lifetime_value,
        average_order_value = EXCLUDED.average_order_value,
        first_order_at = EXCLUDED.first_order_at,
        last_order_at = EXCLUDED.last_order_at,
        last_order_days_ago = EXCLUDED.last_order_days_ago,
        updated_at = NOW()
    `;
  } else {
    await sql`
      WITH metrics AS (
        SELECT
          contact_id,
          COUNT(*) AS order_count,
          COALESCE(SUM(total_amount), 0) AS lifetime_value,
          COALESCE(AVG(total_amount), 0) AS average_order_value,
          MIN(order_created_at) AS first_order_at,
          MAX(order_created_at) AS last_order_at
        FROM customer_order_facts
        WHERE contact_id IS NOT NULL
        GROUP BY contact_id
      )
      INSERT INTO customer_aggregate_metrics (
        contact_id,
        order_count,
        lifetime_value,
        average_order_value,
        first_order_at,
        last_order_at,
        last_order_days_ago,
        updated_at
      )
      SELECT
        m.contact_id,
        m.order_count::INTEGER,
        m.lifetime_value,
        m.average_order_value,
        m.first_order_at,
        m.last_order_at,
        CASE
          WHEN m.last_order_at IS NULL THEN NULL
          ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - m.last_order_at)) / 86400)::INTEGER
        END,
        NOW()
      FROM metrics m
      ON CONFLICT (contact_id)
      DO UPDATE SET
        order_count = EXCLUDED.order_count,
        lifetime_value = EXCLUDED.lifetime_value,
        average_order_value = EXCLUDED.average_order_value,
        first_order_at = EXCLUDED.first_order_at,
        last_order_at = EXCLUDED.last_order_at,
        last_order_days_ago = EXCLUDED.last_order_days_ago,
        updated_at = NOW()
    `;
  }
}

export async function recomputeCustomerAffinities(contactId?: string): Promise<void> {
  if (contactId) {
    await sql`DELETE FROM customer_product_affinity WHERE contact_id = ${contactId}`;
  } else {
    await sql`TRUNCATE TABLE customer_product_affinity`;
  }

  const result = await sql`
    SELECT
      cof.contact_id,
      item->>'product_type' AS product_type,
      item->>'vendor' AS vendor,
      item->>'title' AS product_handle,
      SUM(COALESCE((item->>'quantity')::INTEGER, 0))::INTEGER AS order_count,
      SUM(COALESCE((item->>'price')::NUMERIC, 0) * COALESCE((item->>'quantity')::NUMERIC, 0)) AS total_spend
    FROM customer_order_facts cof
    CROSS JOIN LATERAL jsonb_array_elements(cof.line_items) item
    WHERE cof.contact_id IS NOT NULL
      AND (${contactId ?? null}::UUID IS NULL OR cof.contact_id = ${contactId ?? null}::UUID)
    GROUP BY cof.contact_id, item->>'product_type', item->>'vendor', item->>'title'
  `;

  for (const row of result.rows) {
    await sql`
      INSERT INTO customer_product_affinity (
        contact_id,
        product_type,
        vendor,
        product_handle,
        order_count,
        total_spend,
        updated_at
      )
      VALUES (
        ${row.contact_id as string},
        ${(row.product_type as string | null) ?? null},
        ${(row.vendor as string | null) ?? null},
        ${(row.product_handle as string | null) ?? null},
        ${Number(row.order_count || 0)},
        ${Number(row.total_spend || 0)},
        NOW()
      )
      ON CONFLICT (contact_id, product_type, vendor, product_handle)
      DO UPDATE SET
        order_count = EXCLUDED.order_count,
        total_spend = EXCLUDED.total_spend,
        updated_at = NOW()
    `;
  }
}
