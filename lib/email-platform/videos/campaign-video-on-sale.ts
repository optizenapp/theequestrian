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

const ON_SALE_FALLBACK_ABOUT =
  'Limited-time savings on premium equestrian gear. Stock up on rider essentials and stable favourites while sale prices last.';

export async function generateOnSaleSlidesCampaignVideo(params: {
  campaignId: string;
  campaign: CampaignVideoRow;
  subjectLine: string;
  brand: VideoBrandStyle;
  musicAsset: MusicAsset;
  voiceoverExclusion?: VoiceoverExclusion;
}): Promise<CampaignVideoSummary> {
  const { campaignId, campaign, subjectLine, brand, musicAsset, voiceoverExclusion } = params;
  const ctaUrl = resolveOnSaleCtaUrl(campaign);
  const subtitle = resolveCampaignSubtitle(campaign);

  const aboutText =
    extractBrandAboutFromTemplateBlocks(campaign.template_blocks) || ON_SALE_FALLBACK_ABOUT;

  const handles = getCampaignProductHandles(campaign.metadata);
  const productsRaw = await loadBrandVideoProducts(handles);
  if (productsRaw.length === 0) {
    throw new Error('On-sale slide video requires at least one valid product handle');
  }
  const products = padProductsToThree(productsRaw);
  const siteLogoBuffer = await loadSiteLogoForBrandVideo();
  const slideCopyResult = await buildValidatedSlideCopy(
    {
      variant: 'on_sale',
      subjectLine,
      displayName: 'Sale Picks',
      aboutText,
      categoryHandle: null,
      ctaUrl,
      productTitles: products.map((p) => p.title).filter(Boolean),
    },
    { override: getSlideCopyOverride(campaign.metadata) }
  );
  console.log(
    `[video-copy] variant=on_sale source=${slideCopyResult.source} reason=${slideCopyResult.rejectionReason || '-'}`
  );

  const audio = await buildAudioWithVoiceover({
    musicAsset,
    subjectLine,
    brandName: 'Sale Picks',
    scriptKind: 'on_sale',
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
    compositionMode: 'on_sale_slides_v1',
    totalDurationSeconds: audio.totalDurationSeconds,
    brandSlides: {
      variant: 'on_sale',
      brandName: '',
      aboutText,
      subjectLine,
      slideCopy: slideCopyResult.copy,
      categoryHandle: null,
      products,
      siteLogoBuffer,
      brandLogoBuffer: null,
    },
    promptPayload: {
      compositionTemplate: 'on_sale_slides_v1',
      subjectLine,
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
    template: 'on_sale_slides_v1',
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

function resolveOnSaleCtaUrl(campaign: CampaignVideoRow): string {
  const meta = campaign.metadata;
  if (meta && typeof meta.ctaUrl === 'string' && meta.ctaUrl.trim()) {
    return meta.ctaUrl.trim();
  }
  return 'https://www.theequestrian.com.au/on-sale';
}
