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

/** Clear segment memberships so unsubscribed contacts leave marketing audience sets. */
async function removeContactFromSegments(contactId: string): Promise<void> {
  await sql`
    DELETE FROM email_segment_memberships
    WHERE contact_id = ${contactId}
  `;
}

/** Stop active automations so sequence emails stop after unsubscribe. */
async function stopActiveSequenceEnrollments(
  contactId: string,
  exitReason: string
): Promise<void> {
  await sql`
    UPDATE email_sequence_enrollments
    SET status = 'stopped',
        exited_at = NOW(),
        exit_reason = ${exitReason},
        next_run_at = NOW()
    WHERE contact_id = ${contactId}
      AND status = 'active'
  `;
}

/** Remove from marketing lists/segments and stop sequences (shared by unsubscribe + suppression). */
export async function clearMarketingAudiences(
  contactId: string,
  exitReason = 'unsubscribed'
): Promise<void> {
  await moveContactToUnsubscribedList(contactId);
  await removeContactFromSegments(contactId);
  await stopActiveSequenceEnrollments(contactId, exitReason);
}

/**
 * Global marketing opt-out for a contact:
 * - email_subscriptions → unsubscribed
 * - email_contacts.accepts_marketing → false
 * - remove from all lists except Unsubscribed
 * - remove from all segments
 * - stop active sequence enrollments
 */
export async function applyGlobalMarketingOptOut(contactId: string): Promise<void> {
  await sql`
    UPDATE email_subscriptions
    SET status = 'unsubscribed',
        unsubscribed_at = COALESCE(unsubscribed_at, NOW()),
        updated_at = NOW()
    WHERE contact_id = ${contactId}
  `;

  await sql`
    INSERT INTO email_subscriptions (contact_id, status, source, unsubscribed_at, updated_at)
    VALUES (${contactId}, 'unsubscribed', 'unsubscribe', NOW(), NOW())
    ON CONFLICT (contact_id) DO NOTHING
  `;

  await sql`
    UPDATE email_contacts
    SET accepts_marketing = false,
        updated_at = NOW()
    WHERE id = ${contactId}
  `;

  await clearMarketingAudiences(contactId);
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
  const found = await sql`
    SELECT contact_id
    FROM email_subscriptions
    WHERE unsubscribe_token::TEXT = ${token}
    LIMIT 1
  `;
  const contactId = found.rows[0]?.contact_id as string | undefined;
  if (!contactId) {
    return null;
  }

  await applyGlobalMarketingOptOut(contactId);
  return { contactId };
}
