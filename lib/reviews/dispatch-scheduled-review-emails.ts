import { sql } from '@vercel/postgres';
import { sendSesHtmlEmail } from '@/lib/email-platform/ses-mailer';

type DueRow = {
  id: string;
  customer_email: string;
  email_subject: string;
  email_html: string;
  email_from: string;
};

export async function dispatchDueReviewEmails(input: {
  limit: number;
}): Promise<{ sent: number; failed: number }> {
  const result = await sql`
    SELECT id, customer_email, email_subject, email_html, email_from
    FROM review_email_sends
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= NOW()
      AND email_html IS NOT NULL
      AND email_subject IS NOT NULL
      AND email_from IS NOT NULL
    ORDER BY scheduled_at ASC
    LIMIT ${input.limit}
  `;

  const rows = result.rows as DueRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const messageId = await sendSesHtmlEmail({
        fromEmailAddress: row.email_from,
        toAddresses: [row.customer_email],
        subject: row.email_subject,
        htmlBody: row.email_html,
      });

      await sql`
        UPDATE review_email_sends
        SET status = 'sent',
            sent_at = NOW(),
            resend_email_id = ${messageId},
            error_message = NULL
        WHERE id = ${row.id}
          AND status = 'scheduled'
      `;
      sent += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await sql`
        UPDATE review_email_sends
        SET status = 'failed',
            error_message = ${msg}
        WHERE id = ${row.id}
          AND status = 'scheduled'
      `;
      failed += 1;
    }
  }

  return { sent, failed };
}
