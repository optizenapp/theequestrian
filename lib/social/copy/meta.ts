import { buildFollowBlock, STORE_URL } from '@/lib/social/social-links';
import type { YoutubeCopyContext } from './types';

export type MetaPostCopy = {
  variant: 'landscape_16_9' | 'vertical_9_16';
  title: string;
  caption: string;
  hashtags: string[];
};

function resolveHook(context: YoutubeCopyContext): string {
  const title = context.slideCopy?.s1?.title?.trim();
  const subtitle = context.slideCopy?.s1?.subtitle?.trim();
  if (title && subtitle) return `${title}. ${subtitle}`;
  if (title) return title;
  if (subtitle) return subtitle;
  return context.subjectLine || 'New picks from The Equestrian';
}

function buildProductLines(context: YoutubeCopyContext): string[] {
  return (context.productLinks ?? []).slice(0, 4).map((product) => `• ${product.title} — ${product.url}`);
}

export function buildMetaFallbackCopy(context: YoutubeCopyContext, channel: 'facebook' | 'instagram'): MetaPostCopy {
  const hashtags = channel === 'instagram'
    ? ['#TheEquestrian', '#EquestrianStyle', '#HorseRiding', '#RiderGear']
    : ['#TheEquestrian', '#HorseRiding', '#EquestrianStyle'];
  const sections = [resolveHook(context)];
  const products = buildProductLines(context);
  if (products.length) sections.push(['Featured in this video:', ...products].join('\n'));
  if (context.collectionLabel && context.collectionUrl) {
    sections.push(`Shop ${context.collectionLabel}: ${context.collectionUrl}`);
  } else {
    sections.push(`Browse the store: ${STORE_URL}`);
  }
  sections.push(buildFollowBlock());
  sections.push(hashtags.join(' '));
  return {
    variant: context.variant,
    title: resolveHook(context),
    caption: sections.join('\n\n').trim(),
    hashtags,
  };
}
