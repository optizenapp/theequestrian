import type { AutoCampaignSlot } from './types';

/** Default: Mon brand 9am, Wed on-sale 2pm, Fri category 6pm AEST */
export const DEFAULT_AUTO_CAMPAIGN_SLOTS: AutoCampaignSlot[] = [
  { type: 'brand', weekday: 1, hour: 9, minute: 0 },
  { type: 'on_sale', weekday: 3, hour: 14, minute: 0 },
  { type: 'category', weekday: 5, hour: 18, minute: 0 },
];

/** Shopify collection handles to rotate for category emails */
export const DEFAULT_CATEGORY_POOL: string[] = [
  'horse-tack',
  'clothing',
  'footwear',
  'pet',
  'on-sale',
];
