import type { RewardsOrderRow, RewardsSummary } from '@/lib/rewards/admin-report';
import type { CreditPostingRow } from '@/lib/rewards/credit-postings';

export type AdminRewardsSettings = {
  recordingEnabled: boolean;
  estimateEnabled: boolean;
  issuanceEnabled: boolean;
  redemptionEnabled: boolean;
  rateBps: number;
  launchAt: string | null;
};

export type AdminStoreCreditStatus = {
  missingScopes: string[];
  scopeError: string | null;
  postings: CreditPostingRow[];
};

export type AdminRewardsReport = {
  settings: AdminRewardsSettings;
  summary: RewardsSummary;
  orders: RewardsOrderRow[];
};
