import { buildFollowBlock, STORE_URL } from '@/lib/social/social-links';
import { stripSaleLanguage } from './normalize';
import type { YoutubeCopyContext, YoutubePostCopy } from './types';

function normalizeSubject(subjectLine: string, allowSale: boolean): string {
  const normalized = subjectLine.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New rider essentials at The Equestrian';
  if (allowSale) return normalized;
  const stripped = stripSaleLanguage(normalized).trim();
  return stripped || 'New rider essentials at The Equestrian';
}

function resolveHookFromSlides(context: YoutubeCopyContext): string | null {
  const s1 = context.slideCopy?.s1;
  const title = s1?.title?.trim();
  const subtitle = s1?.subtitle?.trim();
  if (title && subtitle) return `${title}. ${subtitle}`;
  if (title) return title;
  if (subtitle) return subtitle;
  return null;
}

function inferCoreTopic(context: YoutubeCopyContext): string {
  if (context.mode === 'category_slides_v1' && context.categoryName) return context.categoryName;
  if (context.mode === 'brand_slides_v1' && context.brandName) return context.brandName;
  if (context.mode === 'on_sale_slides_v1') return 'On Sale Picks';
  return 'Rider Essentials';
}

function buildProductsBlock(context: YoutubeCopyContext): string {
  const products = (context.productLinks || []).slice(0, 6);
  if (!products.length) return '';
  const lines = ['🛍️ Featured in this video:'];
  for (const p of products) lines.push(`• ${p.title} — ${p.url}`);
  return lines.join('\n');
}

function buildCollectionLine(context: YoutubeCopyContext): string {
  if (!context.collectionLabel || !context.collectionUrl) return '';
  return `🛒 Shop ${context.collectionLabel}: ${context.collectionUrl}`;
}

function buildDescription(context: YoutubeCopyContext, topic: string): string {
  const allowSale = context.mode === 'on_sale_slides_v1';
  const sections: string[] = [];
  const hook = resolveHookFromSlides(context) || normalizeSubject(context.subjectLine, allowSale);
  sections.push(`✨ ${hook}`);
  sections.push(`A short look at ${topic} from The Equestrian — picked for everyday riding.`);
  const products = buildProductsBlock(context);
  if (products) sections.push(products);
  const collection = buildCollectionLine(context);
  if (collection) sections.push(collection);
  sections.push(`🌐 Browse the store: ${STORE_URL}`);
  sections.push(`📲 ${buildFollowBlock()}`);
  const hashtags = context.variant === 'vertical_9_16'
    ? '#Shorts #TheEquestrian #HorseRiding #EquestrianStyle'
    : '#TheEquestrian #HorseRiding #EquestrianStyle #RiderGear';
  sections.push(hashtags);
  return sections.join('\n\n').trim();
}

function buildBaseTitle(context: YoutubeCopyContext, topic: string): string {
  const allowSale = context.mode === 'on_sale_slides_v1';
  const slideTitle = context.slideCopy?.s1?.title?.trim();
  const baseSource = slideTitle || normalizeSubject(context.subjectLine, allowSale);
  if (context.variant === 'vertical_9_16') return `${topic} highlights #Shorts`;
  return `${baseSource} | The Equestrian`;
}

export function buildYoutubeFallbackCopy(context: YoutubeCopyContext): YoutubePostCopy {
  const topic = inferCoreTopic(context);
  const hashtags = context.variant === 'vertical_9_16'
    ? ['#Shorts', '#TheEquestrian', '#HorseRiding']
    : ['#TheEquestrian', '#HorseRiding', '#EquestrianStyle'];
  const tags = [topic, 'The Equestrian', 'equestrian', 'horse riding', 'rider gear'];
  return {
    variant: context.variant,
    title: buildBaseTitle(context, topic),
    description: buildDescription(context, topic),
    tags,
    hashtags,
    categoryId: '22',
    privacyStatus: 'public',
    madeForKids: false,
  };
}
