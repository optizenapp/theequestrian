export type AutoCampaignType = 'brand' | 'on_sale' | 'category';

export type AutoCampaignSlot = {
  type: AutoCampaignType;
  /** 0=Sun .. 6=Sat, Sydney calendar day for send */
  weekday: number;
  hour: number;
  /** Minute in hour; currently supports :00 and :30. */
  minute: 0 | 30;
};

export type AutoCampaignRotation = {
  brandIndex: number;
  categoryIndex: number;
};

export type AutoCampaignResendConfig = {
  enabled: boolean;
  delayHours: number;
  maxWaves: number;
};

export type AutoCampaignTemplatesByType = {
  brand: string | null;
  on_sale: string | null;
  category: string | null;
};

export type AutoCampaignEnabledTypes = Record<AutoCampaignType, boolean>;

export type AutoCampaignSelections = {
  brandHandle: string | null;
  categoryCollectionHandle: string | null;
};
