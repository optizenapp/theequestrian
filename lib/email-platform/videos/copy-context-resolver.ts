import { getProductByHandle } from '@/lib/shopify/products';
import { extractBrandAboutFromTemplateBlocks, resolveBrandNameForVideo } from './brand-video-content';
import {
  resolveCategoryCtaUrl,
  resolveCategoryDisplayName,
  resolveCategoryHandle,
} from './campaign-video-category-resolve';
import {
  getCampaignProductHandles,
  type CampaignVideoRow,
} from './campaign-video-context';
import type { SlideCopyContext } from './copy-types';
import type { SlideVariant } from './video-render-types';

export function resolveCampaignVariant(campaign: CampaignVideoRow): SlideVariant {
  const autoType =
    campaign.metadata && typeof campaign.metadata.autoType === 'string'
      ? campaign.metadata.autoType.trim().toLowerCase()
      : '';
  if (autoType === 'on_sale') return 'on_sale';
  if (autoType === 'category') return 'category';
  return 'brand';
}

export function resolveCopyContext(
  campaign: CampaignVideoRow,
  subjectLine: string
): SlideCopyContext {
  const variant = resolveCampaignVariant(campaign);
  const aboutText =
    extractBrandAboutFromTemplateBlocks(campaign.template_blocks) ||
    'Discover premium rider essentials curated for Australian equestrian life.';

  if (variant === 'category') {
    return {
      variant,
      displayName: resolveCategoryDisplayName(campaign),
      aboutText,
      categoryHandle: resolveCategoryHandle(campaign),
      ctaUrl: resolveCategoryCtaUrl(campaign),
      subjectLine,
    };
  }

  if (variant === 'on_sale') {
    const ctaUrl =
      campaign.metadata && typeof campaign.metadata.ctaUrl === 'string' && campaign.metadata.ctaUrl.trim()
        ? campaign.metadata.ctaUrl.trim()
        : 'https://www.theequestrian.com.au/on-sale';
    return {
      variant,
      displayName: 'Sale Picks',
      aboutText,
      categoryHandle: null,
      ctaUrl,
      subjectLine,
    };
  }

  const ctaUrl =
    campaign.metadata && typeof campaign.metadata.ctaUrl === 'string' && campaign.metadata.ctaUrl.trim()
      ? campaign.metadata.ctaUrl.trim()
      : 'https://www.theequestrian.com.au';
  return {
    variant,
    displayName: resolveBrandNameForVideo(campaign, []),
    aboutText,
    categoryHandle: null,
    ctaUrl,
    subjectLine,
  };
}

export async function loadCopyProductTitles(campaign: CampaignVideoRow): Promise<string[]> {
  const handles = getCampaignProductHandles(campaign.metadata).slice(0, 6);
  const titles: string[] = [];
  for (const handle of handles) {
    try {
      const product = await getProductByHandle(handle, { cache: 'no-store' });
      if (product?.title) titles.push(product.title);
    } catch {
      // ignore single product failures
    }
  }
  return titles;
}
