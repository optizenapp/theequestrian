import { sql } from '@/lib/db/vercel-postgres';

const UNSUBSCRIBED_LIST_NAME = 'Unsubscribed';

async function getOrCreateUnsubscribedListId(): Promise<string> {
  const existing = await sql`
    SELECT id
    FROM email_lists
    WHERE name = ${UNSUBSCRIBED_LIST_NAME}
    LIMIT 1
  `;
  const existingId = existing.rows[0]?.id as string | undefined;
  if (existingId) {
    return existingId;
  }

  const inserted = await sql`
    INSERT INTO email_lists (name, description, updated_at)
    VALUES (${UNSUBSCRIBED_LIST_NAME}, ${'Global unsubscribe/suppression list'}, NOW())
    RETURNING id
  `;
  return inserted.rows[0]?.id as string;
}

export async function moveContactToUnsubscribedList(contactId: string): Promise<void> {
  const unsubscribedListId = await getOrCreateUnsubscribedListId();

  await sql`
    DELETE FROM email_list_memberships
    WHERE contact_id = ${contactId}
      AND list_id <> ${unsubscribedListId}
  `;

  await sql`
    INSERT INTO email_list_memberships (list_id, contact_id, source)
    VALUES (${unsubscribedListId}, ${contactId}, 'unsubscribe')
    ON CONFLICT (list_id, contact_id) DO NOTHING
  `;
}

export async function getOrCreateUnsubscribeToken(contactId: string): Promise<string> {
  const existing = await sql`
    SELECT unsubscribe_token::TEXT AS token
    FROM email_subscriptions
    WHERE contact_id = ${contactId}
    LIMIT 1
  `;
  const token = existing.rows[0]?.token as string | undefined;
  if (token) {
    return token;
  }

  const inserted = await sql`
    INSERT INTO email_subscriptions (contact_id, status, source, updated_at)
    VALUES (${contactId}, 'pending', 'system', NOW())
    ON CONFLICT (contact_id)
    DO UPDATE SET updated_at = NOW()
    RETURNING unsubscribe_token::TEXT AS token
  `;
  return inserted.rows[0]?.token as string;
}

export async function buildUnsubscribeUrl(contactId: string): Promise<string> {
  const token = await getOrCreateUnsubscribeToken(contactId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
  return `${siteUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function unsubscribeByToken(token: string): Promise<{ contactId: string } | null> {
  const result = await sql`
    UPDATE email_subscriptions
    SET status = 'unsubscribed',
        unsubscribed_at = NOW(),
        updated_at = NOW()
    WHERE unsubscribe_token::TEXT = ${token}
    RETURNING contact_id
  `;

  const contactId = result.rows[0]?.contact_id as string | undefined;
  if (!contactId) {
    return null;
  }

  await moveContactToUnsubscribedList(contactId);
  return { contactId };
}
