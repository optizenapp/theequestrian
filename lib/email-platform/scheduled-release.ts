import { sql } from '@vercel/postgres';
import { getResolvedAudienceContactIds } from '@/lib/email-platform/segments';
import { queueCampaignRecipients } from '@/lib/email-platform/sending';

export type ReleasedCampaign = { id: string; name: string; queued: number };

/**
 * Move due `scheduled` campaigns to `processing` after queueing recipients.
 * Used by auto-weekly-release cron and admin "Release now" tooling.
 */
export async function releaseDueScheduledCampaigns(input?: { windowHours?: number }): Promise<ReleasedCampaign[]> {
  const windowHours = Math.min(168, Math.max(1, input?.windowHours ?? 1));
  const windowLabel = `${windowHours} hours`;
  const due = await sql`
    SELECT id, name, audience, scheduled_at
    FROM email_campaigns
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= NOW()
      AND scheduled_at > NOW() - (${windowLabel})::interval
      AND COALESCE((metadata->>'paused')::boolean, false) = false
  `;

  const released: ReleasedCampaign[] = [];

  for (const row of due.rows) {
    const campaignId = row.id as string;
    const name = row.name as string;
    const audience = (row.audience as { listIds?: string[]; segmentIds?: string[] }) || {};
    const listIds = audience.listIds || [];
    const segmentIds = audience.segmentIds || [];

    const contactIds = await getResolvedAudienceContactIds({ listIds, segmentIds });
    const queued = await queueCampaignRecipients(campaignId, contactIds);

    await sql`
      UPDATE email_campaigns
      SET status = 'processing',
          updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    released.push({ id: campaignId, name, queued });
  }

  return released;
}
