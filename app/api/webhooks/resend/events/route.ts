import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { markSuppressedByEmail } from '@/lib/email-platform/sending';

type ResendEventPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    recipient?: string;
    click?: {
      link?: string;
      ip_address?: string;
      user_agent?: string;
      timestamp?: string;
    };
    open?: {
      ip_address?: string;
      user_agent?: string;
      timestamp?: string;
    };
  };
};

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = request.headers.get('x-resend-signature');
      if (!headerSecret || headerSecret !== secret) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = (await request.json()) as ResendEventPayload;
    const eventType = payload.type || 'unknown';
    const messageId = payload.data?.email_id || null;
    const recipient = payload.data?.recipient || payload.data?.to?.[0] || null;

    let sendId: string | null = null;
    if (messageId) {
      const sendResult = await sql`
        SELECT id
        FROM email_sends
        WHERE provider_message_id = ${messageId}
        LIMIT 1
      `;
      sendId = (sendResult.rows[0]?.id as string | undefined) ?? null;
    }

    await sql`
      INSERT INTO email_events (send_id, provider, provider_message_id, event_type, payload, occurred_at)
      VALUES (
        ${sendId},
        'resend',
        ${messageId},
        ${eventType},
        ${JSON.stringify(payload)},
        ${payload.created_at || new Date().toISOString()}
      )
    `;

    if (sendId) {
      const mappedStatus =
        eventType === 'email.delivered'
          ? 'delivered'
          : eventType === 'email.failed'
          ? 'failed'
          : eventType === 'email.bounced' || eventType === 'email.complained'
          ? 'failed'
          : null;

      if (mappedStatus) {
        await sql`
          UPDATE email_sends
          SET status = ${mappedStatus},
              delivered_at = CASE WHEN ${mappedStatus} = 'delivered' THEN NOW() ELSE delivered_at END,
              updated_at = NOW()
          WHERE id = ${sendId}
        `;
      }

      if (eventType === 'email.opened') {
        const openedAt = payload.data?.open?.timestamp || payload.created_at || new Date().toISOString();
        await sql`
          UPDATE email_sends
          SET opened_at = COALESCE(opened_at, ${openedAt}::timestamptz),
              open_count = COALESCE(open_count, 0) + 1,
              updated_at = NOW()
          WHERE id = ${sendId}
        `;
      }

      if (eventType === 'email.clicked') {
        const clickedAt = payload.data?.click?.timestamp || payload.created_at || new Date().toISOString();
        await sql`
          UPDATE email_sends
          SET clicked_at = COALESCE(clicked_at, ${clickedAt}::timestamptz),
              click_count = COALESCE(click_count, 0) + 1,
              updated_at = NOW()
          WHERE id = ${sendId}
        `;

        const clickedUrl = payload.data?.click?.link;
        if (clickedUrl) {
          await sql`
            INSERT INTO email_link_clicks (send_id, clicked_url, ip_address, user_agent, clicked_at)
            VALUES (
              ${sendId},
              ${clickedUrl},
              ${payload.data?.click?.ip_address || null},
              ${payload.data?.click?.user_agent || null},
              ${clickedAt}::timestamptz
            )
          `;
        }
      }
    }

    if (recipient && (eventType === 'email.bounced' || eventType === 'email.complained')) {
      await markSuppressedByEmail(recipient, eventType);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to process Resend webhook event:', error);
    return NextResponse.json({ error: 'Failed to process Resend webhook event' }, { status: 500 });
  }
}
