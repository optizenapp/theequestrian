import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';

export type SlotByType = Record<AutoCampaignType, { weekday: number; hour: number; minute: 0 | 30 }>;

export const AUTO_TYPES: AutoCampaignType[] = ['brand', 'on_sale', 'category'];

export const DEFAULT_SLOTS: SlotByType = {
  brand: { weekday: 1, hour: 9, minute: 0 },
  on_sale: { weekday: 1, hour: 9, minute: 0 },
  category: { weekday: 1, hour: 9, minute: 0 },
};
