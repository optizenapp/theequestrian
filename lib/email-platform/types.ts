export type EmailSubscriptionStatus = 'subscribed' | 'unsubscribed' | 'suppressed' | 'pending';

export type SegmentOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in';

export type SegmentField =
  | 'email'
  | 'order_count'
  | 'lifetime_value'
  | 'average_order_value'
  | 'last_order_days_ago'
  | 'top_product_type'
  | 'top_vendor'
  | 'shopify_customer_tag';

export type SegmentCondition = {
  field: SegmentField;
  operator: SegmentOperator;
  value: string | number | Array<string | number>;
};

export type SegmentRuleGroup = {
  mode: 'all' | 'any';
  conditions: SegmentCondition[];
};

export type AudienceSource = {
  listIds?: string[];
  segmentIds?: string[];
};

export type EmailSendStatus =
  | 'draft'
  | 'queued'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending_approval';

export type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived';

export type SequenceTriggerType =
  | 'new_customer'
  | 'first_order'
  | 'repeat_customer'
  | 'product_type_purchased'
  | 'ltv_threshold_crossed'
  | 'winback_eligible';

export type SequenceStepType = 'wait' | 'send_email' | 'condition_gate';

export type TemplateCategory = 'order_review' | 'subscriber_standard';

export type TemplateDeliveryMode = 'post_fulfillment' | 'manual_or_campaign';

export type CuratedProductCard = {
  id: string;
  handle: string;
  title?: string;
  imageUrl?: string | null;
  url?: string;
  price?: string;
  compareAtPrice?: string;
  savePercent?: string;
  freeShippingBadge?: boolean;
};

export type EmailBlock =
  | { id: string; type: 'heading'; text: string; level?: 1 | 2 | 3; align?: 'left' | 'center' | 'right'; fontSize?: number }
  | { id: string; type: 'text'; text: string; align?: 'left' | 'center' | 'right'; fontSize?: number }
  | { id: string; type: 'llmIntro'; text: string; align?: 'left' | 'center' | 'right'; fontSize?: number; prompt?: string }
  | { id: string; type: 'llmHeading'; text: string; level?: 1 | 2 | 3; align?: 'left' | 'center' | 'right'; fontSize?: number; prompt?: string }
  | { id: string; type: 'cta'; label: string; url: string; align?: 'left' | 'center' | 'right'; fontSize?: number }
  | { id: string; type: 'productCards'; mode: 'single' | 'all'; align?: 'left' | 'center' | 'right'; fontSize?: number }
  | {
      id: string;
      type: 'curatedProducts';
      products: CuratedProductCard[];
      showDividers?: boolean;
      align?: 'left' | 'center' | 'right';
      fontSize?: number;
      prompt?: string;
    }
  | { id: string; type: 'divider'; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'footer'; text: string; align?: 'left' | 'center' | 'right'; fontSize?: number };

export type EmailTemplateVisualSettings = {
  enabled: boolean;
  delayDays: number;
  baseFontSize?: number;
  brandPrimary: string;
  brandDark: string;
  headerBackground: string;
  linkColor: string;
  logoUrl: string | null;
};

export type EmailTemplateMetadata = EmailTemplateVisualSettings & {
  category?: TemplateCategory;
  deliveryMode?: TemplateDeliveryMode;
};
