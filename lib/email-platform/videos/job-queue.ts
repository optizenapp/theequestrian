import { sql } from '@/lib/db/vercel-postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

export type CampaignVideoJobKind =
  | 'create'
  | 'regenerate'
  | 'regenerate_music'
  | 'regenerate_thumbnail';

type EnqueueOptions = {
  campaignId: string;
  jobKind: CampaignVideoJobKind;
  payload?: Record<string, unknown>;
};

/**
 * Insert (or reset) a row in email_campaign_videos with status='queued' so the
 * Fargate worker can pick it up. Returns immediately — no in-process task.
 */
export async function enqueueCampaignVideoJob(options: EnqueueOptions): Promise<void> {
  const { campaignId, jobKind, payload } = options;
  await ensureEmailPlatformSchema();
  const payloadJson = JSON.stringify(payload || {});
  await sql`
    INSERT INTO email_campaign_videos (
      campaign_id, status, job_kind, job_payload, error_message, updated_at
    )
    VALUES (
      ${campaignId}, 'queued', ${jobKind}, ${payloadJson}::jsonb, NULL, NOW()
    )
    ON CONFLICT (campaign_id) DO UPDATE
      SET status = 'queued',
          job_kind = EXCLUDED.job_kind,
          job_payload = EXCLUDED.job_payload,
          job_started_at = NULL,
          worker_id = NULL,
          error_message = NULL,
          updated_at = NOW()
  `;
  console.log(`[video-queue] enqueued campaign=${campaignId} kind=${jobKind}`);
}
