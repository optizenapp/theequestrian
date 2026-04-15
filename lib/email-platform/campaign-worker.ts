import { sql } from '@vercel/postgres';
import { sendQueuedCampaignRecipients } from './sending';

export type CampaignWorkerResult = {
  processed: number;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    before: { queued: number; sent: number };
    result: { sent: number; failed: number; skipped: number };
    after: { queued: number; sent: number };
  }>;
};

/**
 * Find campaigns with queued recipients and process batches.
 * Safe to run repeatedly via cron - will not re-send to already-sent recipients.
 */
export async function processCampaignQueues(input?: { maxCampaigns?: number }): Promise<CampaignWorkerResult> {
  const maxCampaigns = input?.maxCampaigns ?? 5;

  // Find campaigns that have queued recipients and are in active states only
  const campaignsWithQueue = await sql`
    SELECT DISTINCT c.id, c.name, c.status, c.updated_at
    FROM email_campaigns c
    INNER JOIN email_campaign_recipients r ON r.campaign_id = c.id
    WHERE r.status = 'queued'
      AND c.status = 'processing'
    ORDER BY c.updated_at ASC
    LIMIT ${maxCampaigns}
  `;

  const results: CampaignWorkerResult['campaigns'] = [];

  for (const campaignRow of campaignsWithQueue.rows) {
    const campaignId = campaignRow.id as string;
    const campaignName = campaignRow.name as string;
    const campaignStatus = campaignRow.status as string;

    // Double-check campaign status right before processing (race condition guard)
    const statusCheck = await sql`
      SELECT status FROM email_campaigns WHERE id = ${campaignId} LIMIT 1
    `;
    const liveStatus = (statusCheck.rows[0]?.status as string) || 'draft';
    if (liveStatus === 'cancelled' || liveStatus === 'completed') {
      console.log(`Skipping campaign ${campaignId} - status is now ${liveStatus}`);
      continue;
    }

    // Get before stats
    const beforeStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent
      FROM email_campaign_recipients
      WHERE campaign_id = ${campaignId}
    `;
    const before = {
      queued: Number(beforeStats.rows[0]?.queued || 0),
      sent: Number(beforeStats.rows[0]?.sent || 0),
    };

    // Skip if no queued recipients (might have been cancelled between queries)
    if (before.queued === 0) {
      continue;
    }

    // Process this campaign's queue
    const result = await sendQueuedCampaignRecipients({ campaignId });

    // Get after stats
    const afterStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent
      FROM email_campaign_recipients
      WHERE campaign_id = ${campaignId}
    `;
    const after = {
      queued: Number(afterStats.rows[0]?.queued || 0),
      sent: Number(afterStats.rows[0]?.sent || 0),
    };

    results.push({
      id: campaignId,
      name: campaignName,
      status: campaignStatus,
      before,
      result,
      after,
    });
  }

  return {
    processed: results.length,
    campaigns: results,
  };
}
