import { renderCampaignVideoToS3 } from './render';
import {
  extractBrandAboutFromTemplateBlocks,
  loadBrandVideoProducts,
  loadSiteLogoForBrandVideo,
  padProductsToThree,
} from './brand-video-content';
import {
  getCampaignProductHandles,
  resolveCampaignSubtitle,
  type CampaignVideoRow,
} from './campaign-video-context';
import { getSlideCopyOverride } from './slide-copy-override';
import {
  resolveCategoryCtaUrl,
  resolveCategoryDisplayName,
  resolveCategoryHandle,
} from './campaign-video-category-resolve';
import { persistCampaignVideoReady } from './campaign-video-persistence';
import type { VideoBrandStyle } from './brand';
import { buildAudioWithVoiceover } from './voiceover-pipeline';
import type { VoiceoverExclusion } from './voiceover';
import type { generateMusicAsset } from './music';
import { buildValidatedSlideCopy } from './copy-service';
import {
  buildMusicPromptMeta,
  buildVoiceoverPromptMeta,
  type CampaignVideoSummary,
} from './campaign-video-helpers';

type MusicAsset = Awaited<ReturnType<typeof generateMusicAsset>>;

const FALLBACK_ABOUT =
  'Discover premium rider essentials curated for Australian equestrian life.';

export async function generateCategorySlidesCampaignVideo(params: {
  campaignId: string;
  campaign: CampaignVideoRow;
  subjectLine: string;
  brand: VideoBrandStyle;
  musicAsset: MusicAsset;
  voiceoverExclusion?: VoiceoverExclusion;
}): Promise<CampaignVideoSummary> {
  const { campaignId, campaign, subjectLine, brand, musicAsset, voiceoverExclusion } = params;
  const handle = resolveCategoryHandle(campaign);
  const categoryName = resolveCategoryDisplayName(campaign);
  const ctaUrl = resolveCategoryCtaUrl(campaign);
  const subtitle = resolveCampaignSubtitle(campaign);
  const aboutText =
    extractBrandAboutFromTemplateBlocks(campaign.template_blocks) || FALLBACK_ABOUT;

  const handles = getCampaignProductHandles(campaign.metadata);
  const productsRaw = await loadBrandVideoProducts(handles);
  if (productsRaw.length === 0) {
    throw new Error('Category slide video requires at least one valid product handle');
  }
  const products = padProductsToThree(productsRaw);
  const siteLogoBuffer = await loadSiteLogoForBrandVideo();
  const slideCopyResult = await buildValidatedSlideCopy(
    {
      variant: 'category',
      subjectLine,
      displayName: categoryName,
      aboutText,
      categoryHandle: handle,
      ctaUrl,
      productTitles: products.map((p) => p.title).filter(Boolean),
    },
    { override: getSlideCopyOverride(campaign.metadata) }
  );
  console.log(
    `[video-copy] variant=category source=${slideCopyResult.source} reason=${slideCopyResult.rejectionReason || '-'}`
  );

  const audio = await buildAudioWithVoiceover({
    musicAsset,
    subjectLine,
    brandName: categoryName,
    scriptKind: 'category',
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
    logoImageBuffer: null,
    heroImageBuffer: null,
    musicBuffer: audio.audioBuffer,
    musicContentType: audio.audioContentType,
    compositionMode: 'category_slides_v1',
    totalDurationSeconds: audio.totalDurationSeconds,
    brandSlides: {
      variant: 'category',
      brandName: categoryName,
      aboutText,
      subjectLine,
      slideCopy: slideCopyResult.copy,
      categoryHandle: handle,
      products,
      siteLogoBuffer,
      brandLogoBuffer: null,
    },
    promptPayload: {
      compositionTemplate: 'category_slides_v1',
      subjectLine,
      categoryName,
      categoryHandle: handle,
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
    template: 'category_slides_v1',
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
