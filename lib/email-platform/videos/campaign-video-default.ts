import { renderCampaignVideoToS3 } from './render';
import {
  getCampaignProductHandles,
  loadHeroImageBuffer,
  resolveCampaignLogoBuffer,
  resolveCampaignSubtitle,
  type CampaignVideoRow,
} from './campaign-video-context';
import { persistCampaignVideoReady } from './campaign-video-persistence';
import type { VideoBrandStyle } from './brand';
import { buildAudioWithVoiceover } from './voiceover-pipeline';
import type { VoiceoverExclusion } from './voiceover';
import type { generateMusicAsset } from './music';
import { buildMusicPromptMeta, buildVoiceoverPromptMeta, type CampaignVideoSummary } from './campaign-video-helpers';

type MusicAsset = Awaited<ReturnType<typeof generateMusicAsset>>;

export async function generateDefaultCampaignVideo(params: {
  campaignId: string;
  campaign: CampaignVideoRow;
  subjectLine: string;
  brand: VideoBrandStyle;
  musicAsset: MusicAsset;
  voiceoverExclusion?: VoiceoverExclusion;
}): Promise<CampaignVideoSummary> {
  const { campaignId, campaign, subjectLine, brand, musicAsset, voiceoverExclusion } = params;
  const handles = getCampaignProductHandles(campaign.metadata);
  const ctaUrl = 'https://www.theequestrian.com.au';
  const subtitle = resolveCampaignSubtitle(campaign);
  const heroImageBuffer = await loadHeroImageBuffer(handles);
  const logoImageBuffer = await resolveCampaignLogoBuffer(campaign);

  const audio = await buildAudioWithVoiceover({
    musicAsset,
    subjectLine,
    brandName: null,
    voiceoverExclusion,
  });

  const rendered = await renderCampaignVideoToS3({
    campaignId,
    subjectLine,
    subtitle,
    ctaUrl,
    brand,
    logoImageBuffer,
    heroImageBuffer,
    musicBuffer: audio.audioBuffer,
    musicContentType: audio.audioContentType,
    compositionMode: 'default',
    brandSlides: null,
    promptPayload: {
      compositionTemplate: 'default_single_scene',
      subjectLine,
      subtitle,
      ctaUrl,
      brand,
      music: buildMusicPromptMeta(musicAsset),
      voiceover: buildVoiceoverPromptMeta(audio.voiceover, audio.script),
    },
  });

  await persistCampaignVideoReady({
    campaignId,
    template: 'default_single_scene',
    brand,
    musicS3Url: musicAsset?.s3Url || null,
    rendered,
  });

  return {
    campaignName: campaign.name,
    subjectLine,
    status: 'ready_for_review',
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
  };
}
