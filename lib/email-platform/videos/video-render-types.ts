import type { BrandVideoProductRow } from './brand-video-content';
import type { SlideCopy } from './copy-types';

export type CampaignVideoVariant = {
  key: 'landscape_16_9' | 'vertical_9_16';
  width: number;
  height: number;
  aspectRatio: '16:9' | '9:16';
  platformTargets: string[];
  videoUrl: string;
  thumbnailUrl: string | null;
  customThumbnailUrl: string | null;
};

export type SlideVariant = 'brand' | 'on_sale' | 'category';

export type BrandSlidesPayload = {
  variant: SlideVariant;
  brandName: string;
  aboutText: string;
  subjectLine: string;
  slideCopy: SlideCopy;
  /** Collection URL path segment (e.g. footwear); category variant only */
  categoryHandle: string | null;
  products: BrandVideoProductRow[];
  siteLogoBuffer: Buffer | null;
  brandLogoBuffer: Buffer | null;
};

export type CampaignVideoRenderResult = {
  videoUrl: string;
  thumbnailUrl: string | null;
  variants: CampaignVideoVariant[];
  promptPayload: Record<string, unknown>;
  durationSeconds: number;
};

export type RenderInput = {
  campaignId: string;
  subjectLine: string;
  subtitle: string;
  ctaUrl: string;
  brand: {
    primary: string;
    secondary: string;
    foreground: string;
    background: string;
    fontFamily: string;
  };
  logoImageBuffer: Buffer | null;
  heroImageBuffer: Buffer | null;
  musicBuffer: Buffer | null;
  musicContentType: string | null;
  promptPayload: Record<string, unknown>;
  compositionMode: 'default' | 'brand_slides_v1' | 'on_sale_slides_v1' | 'category_slides_v1';
  brandSlides: BrandSlidesPayload | null;
  /** Optional override for the total video duration (seconds). Defaults to TIMING.total. */
  totalDurationSeconds?: number | null;
};
