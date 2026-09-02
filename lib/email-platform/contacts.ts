import { sql } from '@/lib/db/vercel-postgres';
import {
  appendCustomerToSheet,
  isCustomerSheetSyncEnabled,
  replaceCustomerSheetRows,
} from '@/lib/email-platform/google-sheets-sync';

type ShopifyCustomer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  tags: string[];
  acceptsMarketing: boolean;
  postcode?: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toShopifyNumericId(gidOrNumeric: string): string {
  const prefix = 'gid://shopify/Customer/';
  if (gidOrNumeric.startsWith(prefix)) {
    return gidOrNumeric.slice(prefix.length);
  }
  return gidOrNumeric;
}

async function hasPurchasesForContact(email: string, shopifyCustomerId: string | null): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM customer_order_facts
      WHERE customer_email = ${email}
        OR (${shopifyCustomerId} IS NOT NULL AND shopify_customer_id = ${shopifyCustomerId})
    ) AS has_purchases
  `;
  return result.rows[0]?.has_purchases === true || result.rows[0]?.has_purchases === 't';
}

function extractPostcode(metadata: Record<string, unknown>): string | null {
  const directCandidates = ['postcode', 'postalCode', 'zip', 'shopifyPostcode'];
  for (const key of directCandidates) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  const nestedCandidates = ['shopifyDefaultAddress', 'default_address', 'defaultAddress'];
  for (const key of nestedCandidates) {
    const node = metadata[key];
    if (!node || typeof node !== 'object') {
      continue;
    }
    const zip = (node as Record<string, unknown>).zip;
    if (typeof zip === 'string' && zip.trim().length > 0) {
      return zip.trim();
    }
  }

  return null;
}

export async function upsertEmailContact(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  shopifyCustomerId?: string | null;
  acceptsMarketing?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ contactId: string }> {
  const email = normalizeEmail(input.email);
  const shopifyCustomerId = input.shopifyCustomerId
    ? toShopifyNumericId(input.shopifyCustomerId)
    : null;
  const metadata = input.metadata || {};
  const source = input.source || 'import';
  const createdAtIso = new Date().toISOString();

  const result = await sql`
    INSERT INTO email_contacts (
      primary_email,
      shopify_customer_id,
      first_name,
      last_name,
      accepts_marketing,
      metadata,
      updated_at
    )
    VALUES (
      ${email},
      ${shopifyCustomerId},
      ${input.firstName ?? null},
      ${input.lastName ?? null},
      ${input.acceptsMarketing ?? true},
      ${JSON.stringify(metadata)},
      NOW()
    )
    ON CONFLICT (primary_email)
    DO UPDATE SET
      shopify_customer_id = COALESCE(EXCLUDED.shopify_customer_id, email_contacts.shopify_customer_id),
      first_name = COALESCE(EXCLUDED.first_name, email_contacts.first_name),
      last_name = COALESCE(EXCLUDED.last_name, email_contacts.last_name),
      accepts_marketing = EXCLUDED.accepts_marketing,
      metadata = email_contacts.metadata || EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING id, (xmax = 0) AS inserted
  `;

  const contactId = result.rows[0]?.id as string;
  const inserted = result.rows[0]?.inserted === true || result.rows[0]?.inserted === 't';

  if (shopifyCustomerId) {
    await sql`
      INSERT INTO email_contact_identities (
        contact_id,
        provider,
        external_id,
        external_email,
        metadata
      )
      VALUES (
        ${contactId},
        'shopify',
        ${shopifyCustomerId},
        ${email},
        ${JSON.stringify({ source })}
      )
      ON CONFLICT (provider, external_id)
      DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        external_email = EXCLUDED.external_email,
        metadata = email_contact_identities.metadata || EXCLUDED.metadata
    `;
  }

  await sql`
    INSERT INTO email_subscriptions (
      contact_id,
      status,
      source,
      consent_captured_at,
      updated_at
    )
    VALUES (
      ${contactId},
      ${input.acceptsMarketing === false ? 'unsubscribed' : 'subscribed'},
      ${source},
      ${input.acceptsMarketing === false ? null : new Date().toISOString()},
      NOW()
    )
    ON CONFLICT (contact_id)
    DO UPDATE SET
      status = CASE
        WHEN email_subscriptions.status = 'suppressed' THEN 'suppressed'
        ELSE EXCLUDED.status
      END,
      source = EXCLUDED.source,
      updated_at = NOW()
  `;

  if (inserted && isCustomerSheetSyncEnabled()) {
    try {
      const hasPurchases = await hasPurchasesForContact(email, shopifyCustomerId);
      await appendCustomerToSheet({
        email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        shopifyCustomerId,
        countryCode: 'AU',
        postcode: extractPostcode(metadata),
        acceptsMarketing: input.acceptsMarketing !== false,
        customerType: hasPurchases ? 'purchaser' : 'non_purchaser',
        source,
        createdAtIso,
        metadata,
      });
    } catch (error) {
      console.error('[email-contact-sync] failed to append new contact to Google Sheet', {
        email,
        source,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { contactId };
}

export async function backfillCustomerSheetFromContacts(): Promise<{ syncedRows: number }> {
  if (!isCustomerSheetSyncEnabled()) {
    throw new Error('Google Sheets customer sync is not configured');
  }

  const result = await sql`
    SELECT
      c.primary_email,
      c.first_name,
      c.last_name,
      c.shopify_customer_id,
      c.accepts_marketing,
      c.created_at,
      c.metadata,
      COALESCE(s.source, 'import') AS source,
      COALESCE(m.order_count, 0) AS order_count
    FROM email_contacts c
    LEFT JOIN email_subscriptions s ON s.contact_id = c.id
    LEFT JOIN customer_aggregate_metrics m ON m.contact_id = c.id
    ORDER BY c.created_at ASC
  `;

  const rows = result.rows.map((row) => ({
    metadata: (row.metadata as Record<string, unknown> | null) || {},
    email: row.primary_email as string,
    firstName: (row.first_name as string | null) ?? null,
    lastName: (row.last_name as string | null) ?? null,
    shopifyCustomerId: (row.shopify_customer_id as string | null) ?? null,
    countryCode: 'AU' as const,
    postcode: extractPostcode(((row.metadata as Record<string, unknown> | null) || {})),
    acceptsMarketing: (row.accepts_marketing as boolean | null) !== false,
    customerType: Number(row.order_count || 0) > 0 ? ('purchaser' as const) : ('non_purchaser' as const),
    source: (row.source as string | null) || 'import',
    createdAtIso: new Date(row.created_at as string).toISOString(),
  }));

  await replaceCustomerSheetRows(rows);
  return { syncedRows: rows.length };
}

export async function upsertContactFromShopifyCustomer(
  customer: ShopifyCustomer
): Promise<{ contactId: string } | null> {
  if (!customer.email) {
    return null;
  }

  return upsertEmailContact({
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    shopifyCustomerId: customer.id,
    acceptsMarketing: customer.acceptsMarketing,
    source: 'shopify_sync',
    metadata: {
      shopifyTags: customer.tags,
      shopifyPostcode: customer.postcode ?? null,
    },
  });
}

export async function getContacts(limit = 100): Promise<
  Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    shopifyCustomerId: string | null;
    subscriptionStatus: string;
    orderCount: number;
    lifetimeValue: number;
    lastOrderAt: string | null;
    createdAt: string;
  }>
> {
  const result = await sql`
    SELECT
      c.id,
      c.primary_email,
      c.first_name,
      c.last_name,
      c.shopify_customer_id,
      COALESCE(s.status, 'pending') AS subscription_status,
      COALESCE(m.order_count, 0) AS order_count,
      COALESCE(m.lifetime_value, 0) AS lifetime_value,
      m.last_order_at,
      c.created_at
    FROM email_contacts c
    LEFT JOIN email_subscriptions s ON s.contact_id = c.id
    LEFT JOIN customer_aggregate_metrics m ON m.contact_id = c.id
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: row.id as string,
    email: row.primary_email as string,
    firstName: (row.first_name as string | null) ?? null,
    lastName: (row.last_name as string | null) ?? null,
    shopifyCustomerId: (row.shopify_customer_id as string | null) ?? null,
    subscriptionStatus: row.subscription_status as string,
    orderCount: Number(row.order_count || 0),
    lifetimeValue: Number(row.lifetime_value || 0),
    lastOrderAt: row.last_order_at ? new Date(row.last_order_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
  }));
}

export async function getContactsPage(input: {
  page: number;
  pageSize: number;
  search?: string;
  email?: string;
  name?: string;
  subscriptionStatus?: string;
  minOrders?: number;
  maxOrders?: number;
  minLtv?: number;
  maxLtv?: number;
}): Promise<{
  rows: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    shopifyCustomerId: string | null;
    subscriptionStatus: string;
    orderCount: number;
    lifetimeValue: number;
    lastOrderAt: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(1, input.pageSize), 200);
  const offset = (page - 1) * pageSize;

  const search = (input.search || '').trim();
  const email = (input.email || '').trim();
  const name = (input.name || '').trim();
  const subscriptionStatus = (input.subscriptionStatus || '').trim();
  const minOrders = Number.isFinite(input.minOrders) ? input.minOrders : null;
  const maxOrders = Number.isFinite(input.maxOrders) ? input.maxOrders : null;
  const minLtv = Number.isFinite(input.minLtv) ? input.minLtv : null;
  const maxLtv = Number.isFinite(input.maxLtv) ? input.maxLtv : null;

  const whereResult = await sql`
    SELECT
      c.id,
      c.primary_email,
      c.first_name,
      c.last_name,
      c.shopify_customer_id,
      COALESCE(s.status, 'pending') AS subscription_status,
      COALESCE(m.order_count, 0) AS order_count,
      COALESCE(m.lifetime_value, 0) AS lifetime_value,
      m.last_order_at,
      c.created_at
    FROM email_contacts c
    LEFT JOIN email_subscriptions s ON s.contact_id = c.id
    LEFT JOIN customer_aggregate_metrics m ON m.contact_id = c.id
    WHERE (
      ${search} = ''
      OR c.primary_email ILIKE ${'%' + search + '%'}
      OR COALESCE(c.first_name, '') ILIKE ${'%' + search + '%'}
      OR COALESCE(c.last_name, '') ILIKE ${'%' + search + '%'}
    )
      AND (${email} = '' OR c.primary_email ILIKE ${'%' + email + '%'})
      AND (
        ${name} = ''
        OR CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) ILIKE ${'%' + name + '%'}
      )
      AND (${subscriptionStatus} = '' OR COALESCE(s.status, 'pending') = ${subscriptionStatus})
      AND (${minOrders}::INT IS NULL OR COALESCE(m.order_count, 0) >= ${minOrders}::INT)
      AND (${maxOrders}::INT IS NULL OR COALESCE(m.order_count, 0) <= ${maxOrders}::INT)
      AND (${minLtv}::NUMERIC IS NULL OR COALESCE(m.lifetime_value, 0) >= ${minLtv}::NUMERIC)
      AND (${maxLtv}::NUMERIC IS NULL OR COALESCE(m.lifetime_value, 0) <= ${maxLtv}::NUMERIC)
    ORDER BY c.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalResult = await sql`
    SELECT COUNT(*) AS total
    FROM email_contacts c
    LEFT JOIN email_subscriptions s ON s.contact_id = c.id
    LEFT JOIN customer_aggregate_metrics m ON m.contact_id = c.id
    WHERE (
      ${search} = ''
      OR c.primary_email ILIKE ${'%' + search + '%'}
      OR COALESCE(c.first_name, '') ILIKE ${'%' + search + '%'}
      OR COALESCE(c.last_name, '') ILIKE ${'%' + search + '%'}
    )
      AND (${email} = '' OR c.primary_email ILIKE ${'%' + email + '%'})
      AND (
        ${name} = ''
        OR CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) ILIKE ${'%' + name + '%'}
      )
      AND (${subscriptionStatus} = '' OR COALESCE(s.status, 'pending') = ${subscriptionStatus})
      AND (${minOrders}::INT IS NULL OR COALESCE(m.order_count, 0) >= ${minOrders}::INT)
      AND (${maxOrders}::INT IS NULL OR COALESCE(m.order_count, 0) <= ${maxOrders}::INT)
      AND (${minLtv}::NUMERIC IS NULL OR COALESCE(m.lifetime_value, 0) >= ${minLtv}::NUMERIC)
      AND (${maxLtv}::NUMERIC IS NULL OR COALESCE(m.lifetime_value, 0) <= ${maxLtv}::NUMERIC)
  `;

  const total = Number(totalResult.rows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows: whereResult.rows.map((row) => ({
      id: row.id as string,
      email: row.primary_email as string,
      firstName: (row.first_name as string | null) ?? null,
      lastName: (row.last_name as string | null) ?? null,
      shopifyCustomerId: (row.shopify_customer_id as string | null) ?? null,
      subscriptionStatus: row.subscription_status as string,
      orderCount: Number(row.order_count || 0),
      lifetimeValue: Number(row.lifetime_value || 0),
      lastOrderAt: row.last_order_at ? new Date(row.last_order_at as string).toISOString() : null,
      createdAt: new Date(row.created_at as string).toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function addContactsToList(listId: string, contactIds: string[], source = 'manual') {
  const uniqueIds = Array.from(new Set(contactIds.filter((id) => typeof id === 'string' && id.length > 0)));
  if (uniqueIds.length === 0) {
    return;
  }

  const chunkSize = 500;
  for (let start = 0; start < uniqueIds.length; start += chunkSize) {
    const chunk = uniqueIds.slice(start, start + chunkSize);
    await sql.query(
      `
        INSERT INTO email_list_memberships (list_id, contact_id, source)
        SELECT $1::uuid, UNNEST($2::uuid[]), $3
        ON CONFLICT (list_id, contact_id) DO NOTHING
      `,
      [listId, chunk, source]
    );
  }
}
