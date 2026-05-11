import { sql } from '@vercel/postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import {
  createCampaignVideo,
  regenerateCampaignVideoWithNewMusic,
} from '@/lib/email-platform/videos/service';
import { regenerateCampaignThumbnails } from '@/lib/email-platform/videos/thumbnail-regenerate';
import type { CampaignVideoJobKind } from '@/lib/email-platform/videos/job-queue';

export type ClaimedJob = {
  campaignId: string;
  jobKind: CampaignVideoJobKind;
};

const VALID_KINDS: CampaignVideoJobKind[] = [
  'create',
  'regenerate',
  'regenerate_music',
  'regenerate_thumbnail',
];

function parseJobKind(value: unknown): CampaignVideoJobKind | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim() as CampaignVideoJobKind;
  return VALID_KINDS.includes(trimmed) ? trimmed : null;
}

/**
 * Atomically claim the next queued job. Uses SELECT FOR UPDATE SKIP LOCKED so
 * multiple workers (now or future) never grab the same row.
 * Sets status='rendering', stamps worker_id and job_started_at.
 */
export async function claimNextJob(workerId: string): Promise<ClaimedJob | null> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    WITH next AS (
      SELECT id
        FROM email_campaign_videos
        WHERE status = 'queued'
          AND job_kind IS NOT NULL
        ORDER BY updated_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    UPDATE email_campaign_videos AS v
       SET status = 'rendering',
           worker_id = ${workerId},
           job_started_at = NOW(),
           updated_at = NOW()
      FROM next
     WHERE v.id = next.id
     RETURNING v.campaign_id, v.job_kind
  `;
  const row = result.rows[0];
  if (!row) return null;
  const jobKind = parseJobKind(row.job_kind);
  if (!jobKind) {
    console.warn(`[video-worker] unrecognised job_kind on campaign=${row.campaign_id}, marking failed`);
    await sql`
      UPDATE email_campaign_videos
         SET status = 'render_failed',
             error_message = 'Unrecognised job_kind',
             updated_at = NOW()
       WHERE campaign_id = ${row.campaign_id}
    `;
    return null;
  }
  return { campaignId: String(row.campaign_id), jobKind };
}

export async function processClaimedJob(job: ClaimedJob): Promise<void> {
  const { campaignId, jobKind } = job;
  const startedAt = Date.now();
  try {
    if (jobKind === 'create' || jobKind === 'regenerate') {
      const result = await createCampaignVideo(campaignId);
      await logEmailAudit({
        actor: 'video-worker',
        action: jobKind === 'create' ? 'campaign_video_created' : 'campaign_video_regenerated',
        entityType: 'email_campaign',
        entityId: campaignId,
        payload: {
          campaignName: result.campaignName,
          status: result.status,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
        },
      });
    } else if (jobKind === 'regenerate_music') {
      const result = await regenerateCampaignVideoWithNewMusic(campaignId);
      await logEmailAudit({
        actor: 'video-worker',
        action: 'campaign_video_music_regenerated',
        entityType: 'email_campaign',
        entityId: campaignId,
        payload: {
          campaignName: result.campaignName,
          status: result.status,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
        },
      });
    } else if (jobKind === 'regenerate_thumbnail') {
      const result = await regenerateCampaignThumbnails(campaignId);
      await logEmailAudit({
        actor: 'video-worker',
        action: 'campaign_video_thumbnails_regenerated',
        entityType: 'email_campaign',
        entityId: campaignId,
        payload: { variants: result.updated },
      });
    }
    const elapsedMs = Date.now() - startedAt;
    console.log(`[video-worker] done campaign=${campaignId} kind=${jobKind} elapsed=${elapsedMs}ms`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Render failed';
    console.error(`[video-worker] failed campaign=${campaignId} kind=${jobKind}: ${message}`);
    await sql`
      UPDATE email_campaign_videos
         SET status = 'render_failed',
             error_message = ${message},
             updated_at = NOW()
       WHERE campaign_id = ${campaignId}
    `.catch((updateError) => {
      const updateMessage = updateError instanceof Error ? updateError.message : 'unknown';
      console.error(`[video-worker] could not record failure campaign=${campaignId}: ${updateMessage}`);
    });
  }
}
