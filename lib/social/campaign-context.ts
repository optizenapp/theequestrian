import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import type { CampaignVideoMode } from './copy/types';

export type CampaignSocialContext = {
  campaignId: string;
  campaignName: string;
  campaignMetadata: Record<string, unknown>;
  campaignVideoId: string;
  campaignVideoStatus: string;
  promptJson: Record<string, unknown>;
  renderConfigJson: Record<string, unknown>;
};

export async function loadCampaignSocialContext(campaignId: string): Promise<CampaignSocialContext> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    SELECT c.id, c.name, c.metadata, v.id AS campaign_video_id, v.status AS campaign_video_status, v.prompt_json, v.render_config_json
    FROM email_campaigns c
    JOIN email_campaign_videos v ON v.campaign_id = c.id
    WHERE c.id = ${campaignId}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) {
    throw new Error('Campaign video not found');
  }
  return {
    campaignId: String(row.id),
    campaignName: String(row.name),
    campaignMetadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    campaignVideoId: String(row.campaign_video_id),
    campaignVideoStatus: String(row.campaign_video_status),
    promptJson:
      row.prompt_json && typeof row.prompt_json === 'object' && !Array.isArray(row.prompt_json)
        ? (row.prompt_json as Record<string, unknown>)
        : {},
    renderConfigJson:
      row.render_config_json && typeof row.render_config_json === 'object' && !Array.isArray(row.render_config_json)
        ? (row.render_config_json as Record<string, unknown>)
        : {},
  };
}

export function resolveVideoModeFromContext(context: CampaignSocialContext): CampaignVideoMode {
  const templateFromPrompt = typeof context.promptJson.compositionTemplate === 'string'
    ? context.promptJson.compositionTemplate
    : '';
  const templateFromRender = typeof context.renderConfigJson.template === 'string'
    ? context.renderConfigJson.template
    : '';
  const template = (templateFromPrompt || templateFromRender).trim();
  if (template === 'brand_slides_v1') return 'brand_slides_v1';
  if (template === 'on_sale_slides_v1') return 'on_sale_slides_v1';
  if (template === 'category_slides_v1') return 'category_slides_v1';
  return 'default_single_scene';
}
