import { sql } from '@vercel/postgres';
import { markSuppressedByEmail } from '@/lib/email-platform/sending';

type SesMailObject = {
  messageId?: string;
  destination?: string[];
};

type SesEventPayload = {
  eventType?: string;
  mail?: SesMailObject;
  open?: { timestamp?: string; ipAddress?: string; userAgent?: string };
  click?: { timestamp?: string; ipAddress?: string; userAgent?: string; link?: string };
  bounce?: { bouncedRecipients?: Array<{ emailAddress?: string }> };
  complaint?: { complainedRecipients?: Array<{ emailAddress?: string }> };
};

function normalizeSesMessageId(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  return t.replace(/^<|>$/g, '');
}

export async function processSesEventFromSnsMessage(messageJson: string): Promise<void> {
  let payload: SesEventPayload;
  try {
    payload = JSON.parse(messageJson) as SesEventPayload;
  } catch {
    return;
  }

  const eventType = String(payload.eventType || '').toLowerCase();
  const messageId = normalizeSesMessageId(payload.mail?.messageId || null);
  if (!messageId) {
    return;
  }

  let sendId: string | null = null;
  const sendResult = await sql`
    SELECT id
    FROM email_sends
    WHERE provider_message_id = ${messageId}
    LIMIT 1
  `;
  sendId = (sendResult.rows[0]?.id as string | undefined) ?? null;

  await sql`
    INSERT INTO email_events (send_id, provider, provider_message_id, event_type, payload, occurred_at)
    VALUES (
      ${sendId},
      'ses',
      ${messageId},
      ${eventType || 'unknown'},
      ${JSON.stringify(payload)},
      NOW()
    )
  `;

  if (!sendId) {
    return;
  }

  const mapFailed =
    eventType === 'bounce' ||
    eventType === 'complaint' ||
    eventType === 'reject' ||
    eventType === 'renderingfailure';
  const mapDelivered = eventType === 'delivery';

  if (mapFailed) {
    await sql`
      UPDATE email_sends
      SET status = 'failed',
          updated_at = NOW()
      WHERE id = ${sendId}
    `;
  } else if (mapDelivered) {
    await sql`
      UPDATE email_sends
      SET status = 'delivered',
          delivered_at = COALESCE(delivered_at, NOW()),
          updated_at = NOW()
      WHERE id = ${sendId}
    `;
  }

  if (eventType === 'open' && payload.open) {
    const openedAt = payload.open.timestamp || new Date().toISOString();
    await sql`
      UPDATE email_sends
      SET opened_at = COALESCE(opened_at, ${openedAt}::timestamptz),
          open_count = COALESCE(open_count, 0) + 1,
          updated_at = NOW()
      WHERE id = ${sendId}
    `;
  }

  if (eventType === 'click' && payload.click) {
    const clickedAt = payload.click.timestamp || new Date().toISOString();
    const clickedUrl = payload.click.link || '';
    await sql`
      UPDATE email_sends
      SET clicked_at = COALESCE(clicked_at, ${clickedAt}::timestamptz),
          click_count = COALESCE(click_count, 0) + 1,
          updated_at = NOW()
      WHERE id = ${sendId}
    `;
    if (clickedUrl) {
      await sql`
        INSERT INTO email_link_clicks (send_id, clicked_url, ip_address, user_agent, clicked_at)
        VALUES (
          ${sendId},
          ${clickedUrl},
          ${payload.click.ipAddress || null},
          ${payload.click.userAgent || null},
          ${clickedAt}::timestamptz
        )
      `;
    }
  }

  const bounceEmail = payload.bounce?.bouncedRecipients?.[0]?.emailAddress;
  const complaintEmail = payload.complaint?.complainedRecipients?.[0]?.emailAddress;
  const recipient =
    bounceEmail ||
    complaintEmail ||
    payload.mail?.destination?.[0] ||
    null;

  if (recipient && (eventType === 'bounce' || eventType === 'complaint')) {
    await markSuppressedByEmail(recipient, eventType);
  }
}
