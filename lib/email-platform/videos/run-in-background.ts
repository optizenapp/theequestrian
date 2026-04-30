import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

type BackgroundRunnerOptions = {
  campaignId: string;
  label: string;
  task: () => Promise<void>;
};

export async function startBackgroundCampaignVideoTask(
  options: BackgroundRunnerOptions
): Promise<void> {
  const { campaignId, label, task } = options;
  await ensureEmailPlatformSchema();
  await sql`
    INSERT INTO email_campaign_videos (campaign_id, status, updated_at)
    VALUES (${campaignId}, 'rendering', NOW())
    ON CONFLICT (campaign_id) DO UPDATE
      SET status = 'rendering',
          error_message = NULL,
          updated_at = NOW()
  `;
  console.log(`[video-bg] queued campaign=${campaignId} action=${label}`);
  setImmediate(() => {
    void task().catch(async (error) => {
      const message = error instanceof Error ? error.message : 'Background task failed';
      console.error(`[video-bg] failed campaign=${campaignId} action=${label}: ${message}`);
      try {
        await sql`
          UPDATE email_campaign_videos
          SET status = 'render_failed',
              error_message = ${message},
              updated_at = NOW()
          WHERE campaign_id = ${campaignId}
        `;
      } catch (updateError) {
        const msg = updateError instanceof Error ? updateError.message : 'unknown';
        console.error(`[video-bg] failed to record error campaign=${campaignId}: ${msg}`);
      }
    });
  });
}
