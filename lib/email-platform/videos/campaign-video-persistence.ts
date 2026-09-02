import { sql } from '@/lib/db/vercel-postgres';
import type { VideoBrandStyle } from './brand';
import type { CampaignVideoRenderResult } from './video-render-types';

export async function persistCampaignVideoReady(params: {
  campaignId: string;
  template: string;
  brand: VideoBrandStyle;
  musicS3Url: string | null;
  rendered: CampaignVideoRenderResult;
}): Promise<void> {
  const { campaignId, template, brand, musicS3Url, rendered } = params;
  await sql`
    UPDATE email_campaign_videos
    SET status = 'ready_for_review',
        prompt_json = ${JSON.stringify(rendered.promptPayload)}::jsonb,
        render_config_json = ${JSON.stringify({
          template,
          fps: 30,
          duration: rendered.durationSeconds,
          brand,
          musicS3Url,
          variants: rendered.variants.map((variant) => ({
            key: variant.key,
            width: variant.width,
            height: variant.height,
            aspectRatio: variant.aspectRatio,
            platformTargets: variant.platformTargets,
            videoUrl: variant.videoUrl,
            thumbnailUrl: variant.thumbnailUrl,
            customThumbnailUrl: variant.customThumbnailUrl,
          })),
        })}::jsonb,
        s3_video_url = ${rendered.videoUrl},
        s3_thumbnail_url = ${rendered.thumbnailUrl},
        error_message = NULL,
        updated_at = NOW()
    WHERE campaign_id = ${campaignId}
  `;
}
