export type SocialVariant = 'landscape_16_9' | 'vertical_9_16';
export type CampaignVideoMode = 'brand_slides_v1' | 'on_sale_slides_v1' | 'category_slides_v1' | 'default_single_scene';

export type YoutubePostCopy = {
  variant: SocialVariant;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  categoryId: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
  madeForKids: boolean;
};

export type ProductLink = { title: string; url: string };

export type SlideCopySnapshot = {
  s1?: { eyebrow?: string; title?: string; subtitle?: string };
  s2?: { eyebrow?: string; title?: string; subtitle?: string; cta?: string; linkText?: string };
  s3?: { eyebrow?: string; title?: string };
  s4?: { eyebrow?: string; title?: string; cta?: string };
};

export type YoutubeCopyContext = {
  variant: SocialVariant;
  mode: CampaignVideoMode;
  subjectLine: string;
  brandName?: string | null;
  categoryName?: string | null;
  ctaUrl?: string | null;
  productLinks?: ProductLink[];
  collectionLabel?: string | null;
  collectionUrl?: string | null;
  slideCopy?: SlideCopySnapshot | null;
  voiceoverScript?: string | null;
};

export type YoutubeCopyBuildResult = {
  copy: YoutubePostCopy;
  source: 'llm' | 'fallback';
  rejectionReason?: string;
};
