import { sql } from '@/lib/db/vercel-postgres';

export type RewardsSettings = {
  recordingEnabled: boolean;
  issuanceEnabled: boolean;
  redemptionEnabled: boolean;
  rateBps: number;
  launchAt: Date | null;
};

const DISABLED: RewardsSettings = {
  recordingEnabled: false,
  issuanceEnabled: false,
  redemptionEnabled: false,
  rateBps: 200,
  launchAt: null,
};

type SettingsRow = {
  recording_enabled: boolean;
  issuance_enabled: boolean;
  redemption_enabled: boolean;
  rate_bps: number;
  launch_at: string | Date | null;
};

/** Fails closed: a missing table or row means the program is off. */
export async function getRewardsSettings(): Promise<RewardsSettings> {
  try {
    const result = await sql<SettingsRow>`
      SELECT recording_enabled, issuance_enabled, redemption_enabled, rate_bps, launch_at
      FROM rewards_settings WHERE id = 1
    `;
    const row = result.rows[0];
    if (!row) return DISABLED;
    return {
      recordingEnabled: row.recording_enabled,
      issuanceEnabled: row.issuance_enabled,
      redemptionEnabled: row.redemption_enabled,
      rateBps: row.rate_bps,
      launchAt: row.launch_at ? new Date(row.launch_at) : null,
    };
  } catch (error) {
    console.error('[rewards] Failed to load settings; treating program as disabled:', error);
    return DISABLED;
  }
}
