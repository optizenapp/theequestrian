export type RewardLineInput = {
  lineId: string;
  quantity: number;
  /** Line total actually charged for merchandise, after allocated discounts, GST inclusive. */
  netCents: number;
  /** False for gift cards, fees and anything else that must not earn or absorb redemption. */
  eligible: boolean;
};

export type RewardCalculationInput = {
  lines: RewardLineInput[];
  /** Rewards the rider asked to apply. Capped at eligible merchandise. */
  requestedRedemptionCents: number;
  rateBps: number;
};

export type RewardLineAllocation = {
  lineId: string;
  quantity: number;
  eligible: boolean;
  netCents: number;
  redeemedCents: number;
  awardCents: number;
};

export type RewardCalculation = {
  rateBps: number;
  eligibleCents: number;
  redeemedCents: number;
  /** Eligible merchandise still payable after redemption; the base the award is earned on. */
  payableEligibleCents: number;
  awardCents: number;
  lines: RewardLineAllocation[];
};

export type ReturnedQuantity = {
  lineId: string;
  quantity: number;
};

export type ReturnSettlement = {
  originalAwardCents: number;
  finalAwardCents: number;
  awardReversalCents: number;
  redeemedRestoredCents: number;
  cashRefundableCents: number;
  retainedPayableEligibleCents: number;
};
