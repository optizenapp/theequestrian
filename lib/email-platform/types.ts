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
  | 'cancelled';

export type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived';

export type SequenceTriggerType =
  | 'new_customer'
  | 'first_order'
  | 'repeat_customer'
  | 'product_type_purchased'
  | 'ltv_threshold_crossed'
  | 'winback_eligible';

export type SequenceStepType = 'wait' | 'send_email' | 'condition_gate';

export type EmailBlock =
  | { id: string; type: 'heading'; text: string; level?: 1 | 2 | 3; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'text'; text: string; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'cta'; label: string; url: string }
  | { id: string; type: 'productCards'; mode: 'single' | 'all' }
  | { id: string; type: 'divider' }
  | { id: string; type: 'footer'; text: string };

export type EmailTemplateVisualSettings = {
  enabled: boolean;
  delayDays: number;
  brandPrimary: string;
  brandDark: string;
  headerBackground: string;
  linkColor: string;
  logoUrl: string | null;
};
