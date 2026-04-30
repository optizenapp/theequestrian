import type { CampaignSocialContext } from '@/lib/social/campaign-context';
import { resolveVideoModeFromContext } from '@/lib/social/campaign-context';
import {
  brandCollectionUrl,
  categoryCollectionUrl,
  productUrl,
  STORE_URL,
} from '@/lib/social/social-links';
import type { ProductLink, SlideCopySnapshot, SocialVariant, YoutubeCopyContext } from './types';

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function resolveSubjectLine(context: CampaignSocialContext): string {
  return (
    readString(context.promptJson, 'subjectLine') ||
    readString(context.campaignMetadata, 'subjectLine') ||
    context.campaignName
  );
}

function buildProductLinks(context: CampaignSocialContext): ProductLink[] {
  const handles = readStringArray(context.campaignMetadata, 'productHandles').slice(0, 6);
  const titles = readStringArray(context.promptJson, 'productTitles');
  return handles.map((handle, index) => ({
    title: titles[index] || handle.replace(/-/g, ' '),
    url: productUrl(handle),
  }));
}

function buildCollectionContext(
  context: CampaignSocialContext
): { collectionLabel: string | null; collectionUrl: string | null } {
  const mode = resolveVideoModeFromContext(context);
  if (mode === 'category_slides_v1') {
    const handle =
      readString(context.promptJson, 'categoryHandle') ||
      readString(context.campaignMetadata, 'categoryCollectionHandle');
    const name = readString(context.promptJson, 'categoryName');
    if (handle) return { collectionLabel: name || handle, collectionUrl: categoryCollectionUrl(handle) };
  }
  if (mode === 'brand_slides_v1') {
    const handle = readString(context.campaignMetadata, 'brandHandle');
    const name = readString(context.promptJson, 'brandName');
    if (handle) return { collectionLabel: name || handle, collectionUrl: brandCollectionUrl(handle) };
    if (name) return { collectionLabel: name, collectionUrl: STORE_URL };
  }
  if (mode === 'on_sale_slides_v1') {
    return { collectionLabel: 'On Sale', collectionUrl: `${STORE_URL}/on-sale` };
  }
  return { collectionLabel: null, collectionUrl: null };
}

function readSlideCopy(context: CampaignSocialContext): SlideCopySnapshot | null {
  const fromPrompt = context.promptJson.slideCopy;
  if (fromPrompt && typeof fromPrompt === 'object' && !Array.isArray(fromPrompt)) {
    return fromPrompt as SlideCopySnapshot;
  }
  const override = context.campaignMetadata.slideCopyOverride;
  if (override && typeof override === 'object' && !Array.isArray(override)) {
    return override as SlideCopySnapshot;
  }
  return null;
}

export function buildYoutubeCopyContext(
  context: CampaignSocialContext,
  variant: SocialVariant
): YoutubeCopyContext {
  const mode = resolveVideoModeFromContext(context);
  const collection = buildCollectionContext(context);
  return {
    variant,
    mode,
    subjectLine: resolveSubjectLine(context),
    brandName: readString(context.promptJson, 'brandName') || null,
    categoryName: readString(context.promptJson, 'categoryName') || null,
    ctaUrl: readString(context.promptJson, 'ctaUrl') || collection.collectionUrl || STORE_URL,
    productLinks: buildProductLinks(context),
    collectionLabel: collection.collectionLabel,
    collectionUrl: collection.collectionUrl,
    slideCopy: readSlideCopy(context),
    voiceoverScript: readString(context.promptJson, 'voiceoverScript') || null,
  };
}
