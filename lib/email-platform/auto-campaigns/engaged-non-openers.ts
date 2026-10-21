import { sql } from '@/lib/db/vercel-postgres';

/** Resends only target contacts who opened or clicked any email within this many days. */
export const RESEND_ENGAGEMENT_WINDOW_DAYS = 90;

export async function loadEngagedNonOpenerContactIds(parentCampaignId: string): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT r.contact_id
    FROM email_campaign_recipients r
    INNER JOIN email_sends s ON s.campaign_recipient_id = r.id
    WHERE r.campaign_id = ${parentCampaignId}
      AND r.status IN ('sent', 'delivered')
      AND s.opened_at IS NULL
      AND s.clicked_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM email_sends e
        WHERE e.contact_id = r.contact_id
          AND (
            e.opened_at >= NOW() - make_interval(days => ${RESEND_ENGAGEMENT_WINDOW_DAYS})
            OR e.clicked_at >= NOW() - make_interval(days => ${RESEND_ENGAGEMENT_WINDOW_DAYS})
          )
      )
  `;
  return result.rows
    .map((row) => row.contact_id as string | null)
    .filter((value): value is string => Boolean(value));
}
