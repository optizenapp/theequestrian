import { renderCampaignVideoToS3 } from './render';
import {
  extractBrandAboutFromTemplateBlocks,
  loadBrandVideoProducts,
  loadSiteLogoForBrandVideo,
  padProductsToThree,
  resolveBrandNameForVideo,
} from './brand-video-content';
import {
  getCampaignProductHandles,
  resolveCampaignLogoBuffer,
  resolveCampaignSubtitle,
  type CampaignVideoRow,
} from './campaign-video-context';
import { getSlideCopyOverride } from './slide-copy-override';
import { persistCampaignVideoReady } from './campaign-video-persistence';
import type { VideoBrandStyle } from './brand';
import { buildAudioWithVoiceover } from './voiceover-pipeline';
import type { VoiceoverExclusion } from './voiceover';
import type { generateMusicAsset } from './music';
import { buildValidatedSlideCopy } from './copy-service';
import { buildMusicPromptMeta, buildVoiceoverPromptMeta, type CampaignVideoSummary } from './campaign-video-helpers';

type MusicAsset = Awaited<ReturnType<typeof generateMusicAsset>>;

export async function generateBrandSlidesCampaignVideo(params: {
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

  const aboutText = extractBrandAboutFromTemplateBlocks(campaign.template_blocks);
  if (!aboutText) {
    throw new Error('Auto campaign slide video requires about text in a text or intro template block');
  }
  const productsRaw = await loadBrandVideoProducts(handles);
  if (productsRaw.length === 0) {
    throw new Error('Auto campaign slide video requires at least one valid product handle');
  }
  const products = padProductsToThree(productsRaw);
  const brandName = resolveBrandNameForVideo(campaign, products);
  const siteLogoBuffer = await loadSiteLogoForBrandVideo();
  const brandLogoBuffer = await resolveCampaignLogoBuffer(campaign);
  const slideCopyResult = await buildValidatedSlideCopy(
    {
      variant: 'brand',
      subjectLine,
      displayName: brandName,
      aboutText,
      categoryHandle: null,
      ctaUrl,
      productTitles: products.map((p) => p.title).filter(Boolean),
    },
    { override: getSlideCopyOverride(campaign.metadata) }
  );
  console.log(
    `[video-copy] variant=brand source=${slideCopyResult.source} reason=${slideCopyResult.rejectionReason || '-'}`
  );

  const audio = await buildAudioWithVoiceover({
    musicAsset,
    subjectLine,
    brandName,
    scriptKind: 'brand',
    voiceoverExclusion,
    slideCopy: slideCopyResult.copy,
    productTitles: products.map((p) => p.title).filter(Boolean),
  });

  const rendered = await renderCampaignVideoToS3({
    campaignId,
    subjectLine,
    subtitle,
    ctaUrl,
    brand,
    logoImageBuffer: brandLogoBuffer,
    heroImageBuffer: null,
    musicBuffer: audio.audioBuffer,
    musicContentType: audio.audioContentType,
    compositionMode: 'brand_slides_v1',
    totalDurationSeconds: audio.totalDurationSeconds,
    brandSlides: {
      variant: 'brand',
      brandName,
      aboutText,
      subjectLine,
      slideCopy: slideCopyResult.copy,
      categoryHandle: null,
      products,
      siteLogoBuffer,
      brandLogoBuffer,
    },
    promptPayload: {
      compositionTemplate: 'brand_slides_v1',
      subjectLine,
      brandName,
      aboutText,
      productTitles: products.map((p) => p.title),
      ctaUrl,
      brand,
      slideCopy: slideCopyResult.copy,
      slideCopySource: slideCopyResult.source,
      slideCopyRejectionReason: slideCopyResult.rejectionReason || null,
      voiceoverScript: audio.script,
      music: buildMusicPromptMeta(musicAsset),
      voiceover: buildVoiceoverPromptMeta(audio.voiceover, audio.script, audio.scriptSource),
    },
  });

  await persistCampaignVideoReady({
    campaignId,
    template: 'brand_slides_v1',
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
