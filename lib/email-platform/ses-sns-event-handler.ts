import { sql } from '@vercel/postgres';
import { markSuppressedByEmail } from '@/lib/email-platform/sending';

type SesSnsEvent = {
  eventType?: string;
  mail?: { messageId?: string; destination?: string[] };
  bounce?: { bouncedRecipients?: Array<{ emailAddress?: string }> };
  complaint?: { complainedRecipients?: Array<{ emailAddress?: string }> };
  click?: { link?: string };
};

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function getMessageId(event: SesSnsEvent): string | null {
  const raw = event.mail?.messageId;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getLowerEventType(event: SesSnsEvent): string {
  return typeof event.eventType === 'string' ? event.eventType.trim().toLowerCase() : 'unknown';
}

function getSuppressedEmails(event: SesSnsEvent): string[] {
  const bounceRecipients = event.bounce?.bouncedRecipients ?? [];
  const complaintRecipients = event.complaint?.complainedRecipients ?? [];
  const recipients = [...bounceRecipients, ...complaintRecipients];
  return recipients
    .map((item) => (typeof item.emailAddress === 'string' ? item.emailAddress.toLowerCase() : ''))
    .filter((email) => email.length > 0);
}

export async function processSesEventFromSnsMessage(input: unknown): Promise<{ accepted: boolean }> {
  const payload = asObject(input);
  if (!payload) return { accepted: false };

  const event = payload as SesSnsEvent;
  const eventType = getLowerEventType(event);
  const providerMessageId = getMessageId(event);

  const sendLookup = providerMessageId
    ? await sql`
        SELECT id, campaign_recipient_id
        FROM email_sends
        WHERE provider = 'ses'
          AND provider_message_id = ${providerMessageId}
        ORDER BY created_at DESC
        LIMIT 1
      `
    : { rows: [] as Array<{ id: string; campaign_recipient_id: string | null }> };
  const sendId = (sendLookup.rows[0]?.id as string | undefined) ?? null;
  const campaignRecipientId =
    (sendLookup.rows[0]?.campaign_recipient_id as string | undefined | null) ?? null;

  await sql`
    INSERT INTO email_events (send_id, provider, provider_message_id, event_type, payload, occurred_at)
    VALUES (
      ${sendId},
      'ses',
      ${providerMessageId},
      ${eventType},
      ${JSON.stringify(payload)},
      NOW()
    )
  `;

  if (sendId) {
    if (eventType === 'delivery') {
      await sql`
        UPDATE email_sends
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = ${sendId}
      `;
      if (campaignRecipientId) {
        await sql`
          UPDATE email_campaign_recipients
          SET status = 'delivered',
              delivered_at = COALESCE(delivered_at, NOW()),
              updated_at = NOW()
          WHERE id = ${campaignRecipientId}
        `;
      }
    } else if (eventType === 'open') {
      await sql`
        UPDATE email_sends
        SET opened_at = COALESCE(opened_at, NOW()),
            open_count = open_count + 1,
            updated_at = NOW()
        WHERE id = ${sendId}
      `;
    } else if (eventType === 'click') {
      await sql`
        UPDATE email_sends
        SET clicked_at = COALESCE(clicked_at, NOW()),
            click_count = click_count + 1,
            updated_at = NOW()
        WHERE id = ${sendId}
      `;
      if (typeof event.click?.link === 'string' && event.click.link.length > 0) {
        await sql`
          INSERT INTO email_link_clicks (send_id, clicked_url)
          VALUES (${sendId}, ${event.click.link})
        `;
      }
    } else if (['bounce', 'complaint', 'reject', 'renderingfailure'].includes(eventType)) {
      await sql`
        UPDATE email_sends
        SET status = 'failed',
            error_message = ${`SES ${eventType}`},
            updated_at = NOW()
        WHERE id = ${sendId}
      `;
      if (campaignRecipientId) {
        await sql`
          UPDATE email_campaign_recipients
          SET status = 'failed',
              skip_reason = ${`SES ${eventType}`},
              updated_at = NOW()
          WHERE id = ${campaignRecipientId}
        `;
      }
    }
  }

  const suppressed = getSuppressedEmails(event);
  if (suppressed.length > 0) {
    await Promise.all(suppressed.map((email) => markSuppressedByEmail(email, `ses_${eventType}`)));
  }

  return { accepted: true };
}
