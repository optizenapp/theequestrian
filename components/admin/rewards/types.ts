import type { RewardsOrderRow, RewardsSummary } from '@/lib/rewards/admin-report';

export type AdminRewardsSettings = {
  recordingEnabled: boolean;
  estimateEnabled: boolean;
  issuanceEnabled: boolean;
  redemptionEnabled: boolean;
  rateBps: number;
  launchAt: string | null;
};

export type AdminRewardsReport = {
  settings: AdminRewardsSettings;
  summary: RewardsSummary;
  orders: RewardsOrderRow[];
};
