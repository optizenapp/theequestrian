export type StandaloneSocialPlatform = 'facebook' | 'instagram' | 'youtube';
export type StandaloneSocialPostKind = 'text' | 'image' | 'video';
export type StandaloneSocialVariant = 'landscape_16_9' | 'vertical_9_16';
export type StandaloneSocialStatus = 'draft' | 'ready_for_review' | 'publishing' | 'published' | 'publish_failed';

export type StandaloneSocialPost = {
  id: string;
  platform: StandaloneSocialPlatform;
  postKind: StandaloneSocialPostKind;
  variant: StandaloneSocialVariant | null;
  status: StandaloneSocialStatus;
  content: string;
  title: string | null;
  mediaUrls: string[];
  sourceUrl: string | null;
  sourceType: string;
  externalPostId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
};

export type StandaloneSocialPostInput = {
  platform: StandaloneSocialPlatform;
  postKind: StandaloneSocialPostKind;
  variant?: StandaloneSocialVariant | null;
  content: string;
  title?: string | null;
  mediaUrls?: string[];
  sourceUrl?: string | null;
  sourceType?: string;
  metadata?: Record<string, unknown>;
};
