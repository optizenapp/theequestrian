import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import { loadBrandStyle } from './brand';
import { generateMusicAsset } from './music';
import {
  loadCampaignVideoRow,
  resolveCampaignSubjectLine,
  type CampaignVideoRow,
} from './campaign-video-context';
import {
  generateAndPersistAutoCampaignVideo,
  type CampaignVideoMode,
} from './campaign-video-generation';
import { blacklistCurrentMusicForCampaign, readMusicBlacklist } from './music-blacklist';
import { selectMusicCategoryForCampaign } from './music-repo';

function resolveCampaignVideoMode(
  campaign: CampaignVideoRow,
  createdBy: string
): CampaignVideoMode {
  const autoType =
    campaign.metadata && typeof campaign.metadata.autoType === 'string'
      ? campaign.metadata.autoType.trim().toLowerCase()
      : '';
  if (autoType === 'on_sale') return 'on_sale_slides_v1';
  if (autoType === 'category') return 'category_slides_v1';
  if (createdBy === 'auto-campaign' || createdBy === 'auto-weekly') return 'brand_slides_v1';
  return 'default_single_scene';
}

export async function createCampaignVideo(campaignId: string): Promise<{
  campaignName: string;
  subjectLine: string;
  status: string;
  videoUrl: string;
  thumbnailUrl: string | null;
}> {
  console.log(`[video-service] start regenerate campaign=${campaignId}`);
  await ensureEmailPlatformSchema();
  const campaign = await loadCampaignVideoRow(campaignId);
  const createdBy =
    campaign.created_by ||
    (campaign.metadata && typeof campaign.metadata.createdBy === 'string'
      ? campaign.metadata.createdBy
      : '');
  const isAuto = createdBy === 'auto-weekly' || createdBy === 'auto-campaign';
  if (!isAuto) throw new Error('Only auto campaigns can create videos');
  const isLegacyAutoDraft = campaign.status === 'draft' && isAuto;
  if (campaign.status !== 'pending_approval' && campaign.status !== 'scheduled' && !isLegacyAutoDraft) {
    throw new Error('Campaign must be pending approval or scheduled');
  }

  const subjectLine = resolveCampaignSubjectLine(campaign);
  if (!subjectLine) throw new Error('Subject line required for video generation');

  const brand = await loadBrandStyle();
  const musicCategory = selectMusicCategoryForCampaign({
    createdBy: createdBy || null,
    metadata: campaign.metadata,
  });
  const musicPrompt = `Create feel-good instrumental music for an ecommerce product video. Subject context: ${subjectLine}. Mood: positive, upbeat, warm, inspiring. Style: modern pop/acoustic blend, clean commercial feel, 100-118 BPM, no vocals, no heavy drops, suitable as background under spoken messaging.`;
  const blacklist = readMusicBlacklist(campaign.metadata);
  console.log(
    `[video-service] generating music campaign=${campaignId} category=${musicCategory} blacklist_size=${blacklist.audioUrls.length + blacklist.taskIds.length + blacklist.filenames.length}`
  );
  const musicAsset = await generateMusicAsset(musicPrompt, musicCategory, {
    audioUrls: blacklist.audioUrls,
    taskIds: blacklist.taskIds,
    filenames: blacklist.filenames,
  });
  console.log(
    `[video-service] music ready campaign=${campaignId} provider=${musicAsset?.metadata.provider ?? 'none'} file=${musicAsset?.metadata.sourceFilename || '-'}`
  );
  const mode = resolveCampaignVideoMode(campaign, createdBy);
  console.log(`[video-service] campaign=${campaignId} mode=${mode}`);

  await sql`
    INSERT INTO email_campaign_videos (campaign_id, status, updated_at)
    VALUES (${campaignId}, 'rendering', NOW())
    ON CONFLICT (campaign_id) DO UPDATE
      SET status = 'rendering',
          error_message = NULL,
          updated_at = NOW()
  `;

  try {
    const result = await generateAndPersistAutoCampaignVideo({
      campaignId,
      campaign,
      subjectLine,
      brand,
      musicAsset,
      mode,
    });
    console.log(`[video-service] done campaign=${campaignId} status=${result.status}`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Render failed';
    console.error(`[video-service] failed campaign=${campaignId}: ${message}`);
    await sql`
      UPDATE email_campaign_videos
      SET status = 'render_failed',
          error_message = ${message},
          updated_at = NOW()
      WHERE campaign_id = ${campaignId}
    `;
    throw new Error(message);
  }
}

export async function updateCampaignVideoReview(
  campaignId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await ensureEmailPlatformSchema();
  await sql`
    UPDATE email_campaign_videos
    SET status = ${status},
        approved_at = CASE WHEN ${status} = 'approved' THEN NOW() ELSE NULL END,
        approved_by = CASE WHEN ${status} = 'approved' THEN 'admin' ELSE NULL END,
        updated_at = NOW()
    WHERE campaign_id = ${campaignId}
  `;
}

export async function regenerateCampaignVideoWithNewMusic(campaignId: string): Promise<{
  campaignName: string;
  subjectLine: string;
  status: string;
  videoUrl: string;
  thumbnailUrl: string | null;
}> {
  await ensureEmailPlatformSchema();
  await blacklistCurrentMusicForCampaign(campaignId);
  return createCampaignVideo(campaignId);
}
