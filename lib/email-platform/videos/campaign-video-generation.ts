import type { generateMusicAsset } from './music';
import type { CampaignVideoRow } from './campaign-video-context';
import type { VideoBrandStyle } from './brand';
import type { VoiceoverExclusion } from './voiceover';
import type { CampaignVideoSummary } from './campaign-video-helpers';
import { generateBrandSlidesCampaignVideo } from './campaign-video-brand-slides';
import { generateDefaultCampaignVideo } from './campaign-video-default';
import { generateOnSaleSlidesCampaignVideo } from './campaign-video-on-sale';
import { generateCategorySlidesCampaignVideo } from './campaign-video-category';

type MusicAsset = Awaited<ReturnType<typeof generateMusicAsset>>;

export type CampaignVideoMode =
  | 'brand_slides_v1'
  | 'on_sale_slides_v1'
  | 'category_slides_v1'
  | 'default_single_scene';

export async function generateAndPersistAutoCampaignVideo(params: {
  campaignId: string;
  campaign: CampaignVideoRow;
  subjectLine: string;
  brand: VideoBrandStyle;
  musicAsset: MusicAsset;
  mode: CampaignVideoMode;
  voiceoverExclusion?: VoiceoverExclusion;
}): Promise<CampaignVideoSummary> {
  if (params.mode === 'brand_slides_v1') {
    return generateBrandSlidesCampaignVideo(params);
  }
  if (params.mode === 'on_sale_slides_v1') {
    return generateOnSaleSlidesCampaignVideo(params);
  }
  if (params.mode === 'category_slides_v1') {
    return generateCategorySlidesCampaignVideo(params);
  }
  return generateDefaultCampaignVideo(params);
}
